"use server";

import { Query } from "node-appwrite";
import { revalidatePath } from "next/cache";
import { createAdminClient, createSessionClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";
import { createAuditLog } from "@/lib/audit";
import { createNotification } from "@/actions/notifications";
import { serialize } from "@/lib/utils";
import type { ProfileDoc, ModerationItemDoc } from "@/lib/appwrite/types";

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

// ─── Guardian eligibility criteria ───────────────────

interface GuardianCriterion {
  met: boolean;
  value: number | boolean;
}

interface GuardianEligibilityResult {
  eligible: boolean;
  criteria: {
    accountAge: GuardianCriterion;
    eventsAttended: GuardianCriterion;
    actionedReports: GuardianCriterion;
    noWarnings: { met: boolean };
  };
}

// ─── promoteToGuardian (admin only) ──────────────────

/**
 * Promote an attendee to the "Community Guardian" role.
 * Guardians are attendees who help moderate the platform.
 * Admins and organisers cannot be guardians.
 */
export async function promoteToGuardian(
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

  // Guardians must be attendees — not admins or organisers
  if (profile.role === "admin" || profile.role === "organiser") {
    return { error: "Only attendees can be promoted to guardian" };
  }

  if (profile.communityRole === "guardian") {
    return { error: "User is already a guardian" };
  }

  await databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.PROFILES,
    profile.$id,
    { communityRole: "guardian" },
  );

  await Promise.all([
    createAuditLog({
      actorId: adminUser.$id,
      action: "admin.guardian_promoted",
      entityType: "profile",
      entityId: profile.$id,
    }),
    createNotification({
      userId,
      type: "community_guardian_promoted",
      title: "You're a Community Guardian!",
      body: "You've been promoted to Community Guardian. Thank you for helping keep our platform safe and welcoming.",
      linkUrl: "/dashboard",
    }),
  ]);

  revalidatePath("/dashboard");
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/community");

  return {};
}

// ─── demoteFromGuardian (admin only) ─────────────────

/**
 * Remove the "Community Guardian" role from a user, reverting them to
 * a regular member.
 */
export async function demoteFromGuardian(
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

  if (profile.communityRole !== "guardian") {
    return { error: "User is not a guardian" };
  }

  await databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.PROFILES,
    profile.$id,
    { communityRole: "member" },
  );

  await createAuditLog({
    actorId: adminUser.$id,
    action: "admin.guardian_demoted",
    entityType: "profile",
    entityId: profile.$id,
  });

  revalidatePath("/dashboard");
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/community");

  return {};
}

// ─── checkGuardianEligibility (admin only) ───────────

/**
 * Check whether a user meets the criteria for Community Guardian promotion.
 * Returns detailed per-criterion results for admin review.
 */
export async function checkGuardianEligibility(
  userId: string,
): Promise<GuardianEligibilityResult | { error: string }> {
  const admin = await requireAdmin();
  if (!admin) return { error: "Unauthorized" };

  const { databases } = admin;

  // Fetch profile
  const { documents } = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.PROFILES,
    [Query.equal("userId", userId), Query.limit(1)],
  );
  const profile = documents[0] as unknown as ProfileDoc | undefined;
  if (!profile) return { error: "User not found" };

  // Account age
  const accountAgeDays = Math.floor(
    (Date.now() - new Date(profile.$createdAt).getTime()) /
      (1000 * 60 * 60 * 24),
  );

  // Actioned reports where this user was the reporter
  const { total: actionedReports } = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.MODERATION_ITEMS,
    [
      Query.equal("reporterId", userId),
      Query.equal("status", "actioned"),
      Query.limit(1),
    ],
  );

  const criteria = {
    accountAge: {
      met: accountAgeDays >= 180,
      value: accountAgeDays,
    },
    eventsAttended: {
      met: profile.totalEventsAttended >= 10,
      value: profile.totalEventsAttended,
    },
    actionedReports: {
      met: actionedReports >= 5,
      value: actionedReports,
    },
    noWarnings: {
      met: profile.warningCount === 0,
    },
  };

  const eligible = Object.values(criteria).every((c) => c.met);

  return serialize({ eligible, criteria });
}

// ─── getGuardianCandidates (admin only) ──────────────

/**
 * List users who could potentially be promoted to Community Guardian.
 * Filters for members (not guardians) with at least 10 events attended.
 * Paginated for admin review.
 */
export async function getGuardianCandidates(
  page = 1,
  limit = 20,
): Promise<{
  candidates: ProfileDoc[];
  total: number;
} | { error: string }> {
  const admin = await requireAdmin();
  if (!admin) return { error: "Unauthorized" };

  const { databases } = admin;

  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const offset = (Math.max(page, 1) - 1) * safeLimit;

  const result = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.PROFILES,
    [
      Query.equal("communityRole", "member"),
      Query.greaterThanEqual("totalEventsAttended", 10),
      Query.orderDesc("totalEventsAttended"),
      Query.limit(safeLimit),
      Query.offset(offset),
    ],
  );

  return serialize({
    candidates: result.documents as unknown as ProfileDoc[],
    total: result.total,
  });
}
