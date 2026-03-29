"use server";

import { Query } from "node-appwrite";
import { revalidatePath } from "next/cache";
import { createAdminClient, createSessionClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";
import { createAuditLog } from "@/lib/audit";
import { createNotification } from "@/actions/notifications";
import { serialize } from "@/lib/utils";
import {
  computeTrustScore,
  meetsVerifiedCriteria,
  type TrustScoreInput,
  type TrustScoreBreakdown,
} from "@/lib/moderation/trust-score";
import type {
  ProfileDoc,
  EventDoc,
  EventRatingDoc,
  BanLevel,
} from "@/lib/appwrite/types";

// ─── Helpers ─────────────────────────────────────────

async function requireAdmin() {
  const sessionClient = await createSessionClient();
  if (!sessionClient) return null;

  const user = await sessionClient.account.get();
  const { databases } = await createAdminClient();

  const { documents } = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.PROFILES,
    [Query.equal("userId", user.$id), Query.limit(1)],
  );

  const profile = documents[0] as unknown as ProfileDoc | undefined;
  if (!profile || profile.role !== "admin") return null;

  return { user, databases, profile };
}

/** Map ProfileDoc.banLevel to the simpler union the trust-score lib expects. */
function normaliseBanLevel(
  level: BanLevel,
): "none" | "temporary" | "permanent" {
  switch (level) {
    case "none":
    case "warned":
      return "none";
    case "temp_banned":
      return "temporary";
    case "permanent_banned":
      return "permanent";
    default:
      return "none";
  }
}

// ─── recomputeTrustScore ─────────────────────────────

/**
 * Fetch all inputs from the database and recompute the trust score for an
 * organiser. Updates the profile document. If the score drops below 60 and
 * the organiser is currently verified, auto-revokes verification.
 *
 * Internal use — no user-facing auth required. Caller must pass a valid
 * organiser ID.
 */
async function recomputeTrustScore(
  organiserId: string,
): Promise<TrustScoreBreakdown | null> {
  const { databases } = await createAdminClient();

  // ── Fetch profile ──────────────────────────────────
  const { documents: profileDocs } = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.PROFILES,
    [Query.equal("userId", organiserId), Query.limit(1)],
  );
  const profile = profileDocs[0] as unknown as ProfileDoc | undefined;
  if (!profile) return null;

  // ── Completed events ───────────────────────────────
  const { total: completedEvents } = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.EVENTS,
    [
      Query.equal("organiserId", organiserId),
      Query.equal("status", "completed"),
      Query.limit(1),
    ],
  );

  // ── Total non-draft events ─────────────────────────
  const { total: totalNonDraftEvents } = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.EVENTS,
    [
      Query.equal("organiserId", organiserId),
      Query.notEqual("status", "draft"),
      Query.limit(1),
    ],
  );

  // ── Ratings ────────────────────────────────────────
  const { documents: ratingDocs, total: totalRatings } =
    await databases.listDocuments(DATABASE_ID, COLLECTIONS.EVENT_RATINGS, [
      Query.equal("organiserId", organiserId),
      Query.limit(100),
    ]);
  const ratings = ratingDocs as unknown as EventRatingDoc[];
  const averageRating =
    totalRatings > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings
      : 0;

  // ── Orders for this organiser's events ─────────────
  const { documents: eventDocs } = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.EVENTS,
    [
      Query.equal("organiserId", organiserId),
      Query.notEqual("status", "draft"),
      Query.limit(500),
      Query.select(["$id"]),
    ],
  );
  const eventIds = (eventDocs as unknown as EventDoc[]).map((e) => e.$id);

  let refundedOrders = 0;
  let totalOrders = 0;

  if (eventIds.length > 0) {
    // Process in batches of 100 (Appwrite Query.equal limit)
    const BATCH_SIZE = 100;
    for (let i = 0; i < eventIds.length; i += BATCH_SIZE) {
      const batch = eventIds.slice(i, i + BATCH_SIZE);

      const [refundedResult, totalResult] = await Promise.all([
        databases.listDocuments(DATABASE_ID, COLLECTIONS.ORDERS, [
          Query.equal("eventId", batch),
          Query.equal("status", "refunded"),
          Query.limit(1),
        ]),
        databases.listDocuments(DATABASE_ID, COLLECTIONS.ORDERS, [
          Query.equal("eventId", batch),
          Query.contains("status", ["paid", "refunded"]),
          Query.limit(1),
        ]),
      ]);

      refundedOrders += refundedResult.total;
      totalOrders += totalResult.total;
    }
  }

  // ── Account age ────────────────────────────────────
  const createdAt = new Date(profile.$createdAt);
  const accountAgeDays = Math.floor(
    (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24),
  );

  // ── Warnings / bans ───────────────────────────────
  const { total: banCount } = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.USER_WARNINGS,
    [
      Query.equal("userId", organiserId),
      Query.contains("level", ["temp_ban", "permanent_ban"]),
      Query.limit(1),
    ],
  );

  // ── Build input & compute ──────────────────────────
  const input: TrustScoreInput = {
    completedEvents,
    totalNonDraftEvents,
    averageRating,
    totalRatings,
    refundedOrders,
    totalOrders,
    accountAgeDays,
    medianResponseTimeHours: 48,
    warningCount: profile.warningCount,
    banCount,
  };

  const breakdown = computeTrustScore(input);

  // ── Persist score ──────────────────────────────────
  const updates: Record<string, unknown> = { trustScore: breakdown.total };

  // Auto-revoke verification if score drops below 60
  if (breakdown.total < 60 && profile.isVerified) {
    updates.isVerified = false;

    await createAuditLog({
      actorId: null,
      action: "system.verification_auto_revoked",
      entityType: "profile",
      entityId: profile.$id,
      metadata: { reason: "trust_score_below_60", score: breakdown.total },
    });
  }

  await databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.PROFILES,
    profile.$id,
    updates,
  );

  return breakdown;
}

// ─── getOrganiserTrustData ───────────────────────────

/**
 * Public-facing READ-ONLY. Returns the existing trust score and verification
 * status from the profile. Does NOT trigger a recompute — use
 * `adminRecomputeTrustScore` or internal callers for that.
 */
export async function getOrganiserTrustData(
  organiserId: string,
): Promise<{
  trustScore: number;
  isVerified: boolean;
} | null> {
  const { databases } = await createAdminClient();

  const { documents } = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.PROFILES,
    [Query.equal("userId", organiserId), Query.limit(1)],
  );

  const profile = documents[0] as unknown as ProfileDoc | undefined;
  if (!profile) return null;

  return serialize({
    trustScore: profile.trustScore,
    isVerified: profile.isVerified,
  });
}

// ─── adminRecomputeTrustScore (admin only) ───────────────

/**
 * Admin-only endpoint to force a trust score recalculation for an organiser.
 */
export async function adminRecomputeTrustScore(
  organiserId: string,
): Promise<{ breakdown: TrustScoreBreakdown; error?: string } | { error: string }> {
  const admin = await requireAdmin();
  if (!admin) return { error: "Unauthorized" };

  const breakdown = await recomputeTrustScore(organiserId);
  if (!breakdown) return { error: "Organiser not found" };

  revalidatePath("/dashboard");
  revalidatePath(`/admin/users/${organiserId}`);

  return { breakdown };
}

// ─── verifyOrganiser (admin only) ────────────────────

/**
 * Grant the "Verified" badge to an organiser. Requires admin role.
 * Checks that the organiser meets all verified criteria before granting.
 */
export async function verifyOrganiser(
  userId: string,
): Promise<{ error?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { error: "Unauthorized" };

  const { databases, user: adminUser } = admin;

  // Fetch the target profile
  const { documents } = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.PROFILES,
    [Query.equal("userId", userId), Query.limit(1)],
  );
  const profile = documents[0] as unknown as ProfileDoc | undefined;
  if (!profile) return { error: "User not found" };

  if (profile.isVerified) return { error: "Already verified" };

  // Fetch completed events count for criteria check
  const { total: completedEvents } = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.EVENTS,
    [
      Query.equal("organiserId", userId),
      Query.equal("status", "completed"),
      Query.limit(1),
    ],
  );

  const accountAgeDays = Math.floor(
    (Date.now() - new Date(profile.$createdAt).getTime()) /
      (1000 * 60 * 60 * 24),
  );

  const eligible = meetsVerifiedCriteria({
    accountAgeDays,
    completedEvents,
    trustScore: profile.trustScore,
    warningCount: profile.warningCount,
    banLevel: normaliseBanLevel(profile.banLevel),
  });

  if (!eligible) {
    return { error: "Organiser does not meet verification criteria" };
  }

  await databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.PROFILES,
    profile.$id,
    { isVerified: true },
  );

  await Promise.all([
    createAuditLog({
      actorId: adminUser.$id,
      action: "admin.organiser_verified",
      entityType: "profile",
      entityId: profile.$id,
      metadata: { trustScore: profile.trustScore },
    }),
    createNotification({
      userId,
      type: "verified_badge_granted",
      title: "You're verified!",
      body: "Congratulations! Your organiser account has been verified. A badge will now appear on your profile and events.",
      linkUrl: "/dashboard",
    }),
  ]);

  revalidatePath("/dashboard");
  revalidatePath(`/admin/users/${userId}`);

  return {};
}

// ─── revokeVerification (admin only) ─────────────────

/**
 * Remove the "Verified" badge from an organiser. Requires admin role.
 */
export async function revokeVerification(
  userId: string,
): Promise<{ error?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { error: "Unauthorized" };

  const { databases, user: adminUser } = admin;

  const { documents } = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.PROFILES,
    [Query.equal("userId", userId), Query.limit(1)],
  );
  const profile = documents[0] as unknown as ProfileDoc | undefined;
  if (!profile) return { error: "User not found" };

  if (!profile.isVerified) return { error: "Not currently verified" };

  await databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.PROFILES,
    profile.$id,
    { isVerified: false },
  );

  await createAuditLog({
    actorId: adminUser.$id,
    action: "admin.organiser_verification_revoked",
    entityType: "profile",
    entityId: profile.$id,
  });

  revalidatePath("/dashboard");
  revalidatePath(`/admin/users/${userId}`);

  return {};
}
