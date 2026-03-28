"use server";

import { ID, Query } from "node-appwrite";
import { z } from "zod/v4";
import { revalidatePath } from "next/cache";
import { createAdminClient, createSessionClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";
import { createAuditLog } from "@/lib/audit";
import { createNotification } from "@/actions/notifications";
import { serialize } from "@/lib/utils";
import type {
  ProfileDoc,
  EventDoc,
  TicketDoc,
  UserWarningDoc,
  BanLevel,
} from "@/lib/appwrite/types";

// ─── Validation ─────────────────────────────────────

const reasonSchema = z.string().min(1, "Reason is required").max(1000, "Reason too long");

// ─── Constants ──────────────────────────────────────

const ALLOWED_BAN_DURATIONS = [1, 7, 30] as const;
type BanDuration = (typeof ALLOWED_BAN_DURATIONS)[number];

// ─── Auth Guard ─────────────────────────────────────

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

// ─── Helpers ────────────────────────────────────────

async function getTargetProfile(
  databases: Awaited<ReturnType<typeof createAdminClient>>["databases"],
  userId: string,
): Promise<ProfileDoc | null> {
  const { documents } = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.PROFILES,
    [Query.equal("userId", userId), Query.limit(1)],
  );
  return (documents[0] as unknown as ProfileDoc) ?? null;
}

function validateNotAdmin(
  target: ProfileDoc,
  adminUserId: string,
): string | null {
  if (target.userId === adminUserId) {
    return "Cannot issue warnings or bans against your own account";
  }
  if (target.role === "admin") {
    return "Cannot issue warnings or bans against admin users";
  }
  return null;
}

// ─── 1. Warn User ───────────────────────────────────

export async function warnUser(
  userId: string,
  reason: string,
  moderationItemId?: string,
): Promise<{ success?: boolean; error?: string }> {
  const reasonParsed = reasonSchema.safeParse(reason);
  if (!reasonParsed.success) return { error: reasonParsed.error.issues[0].message };

  const auth = await requireAdmin();
  if (!auth) return { error: "Admin access required" };

  const { databases, user, profile: adminProfile } = auth;

  const target = await getTargetProfile(databases, userId);
  if (!target) return { error: "User not found" };

  const guard = validateNotAdmin(target, user.$id);
  if (guard) return { error: guard };

  try {
    // Create warning document
    await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.USER_WARNINGS,
      ID.unique(),
      {
        userId,
        level: "warning",
        reason,
        moderationItemId: moderationItemId ?? null,
        issuedBy: user.$id,
        expiresAt: null,
        liftedAt: null,
        liftedBy: null,
      },
    );

    // Update profile
    await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.PROFILES,
      target.$id,
      {
        warningCount: (target.warningCount ?? 0) + 1,
        banLevel: "warned",
      },
    );

    // Notify user
    await createNotification({
      userId,
      type: "moderation_warning",
      title: "You have received a warning",
      body: `Reason: ${reason}`,
      linkUrl: "/dashboard/settings",
    });

    // Audit log
    await createAuditLog({
      actorId: user.$id,
      action: "admin.user_warned",
      entityType: "profile",
      entityId: target.$id,
      metadata: {
        actorName: adminProfile.displayName ?? user.name ?? "Admin",
        targetUserId: userId,
        targetName: target.displayName ?? "Unknown user",
        reason,
        moderationItemId: moderationItemId ?? null,
      },
    });

    revalidatePath("/dashboard/admin/users");
    revalidatePath("/dashboard/admin/moderation");
    return { success: true };
  } catch {
    return { error: "Failed to issue warning" };
  }
}

// ─── 2. Temporary Ban ───────────────────────────────

export async function tempBanUser(
  userId: string,
  reason: string,
  durationDays: number,
  moderationItemId?: string,
): Promise<{ success?: boolean; error?: string }> {
  const reasonParsed = reasonSchema.safeParse(reason);
  if (!reasonParsed.success) return { error: reasonParsed.error.issues[0].message };

  const auth = await requireAdmin();
  if (!auth) return { error: "Admin access required" };

  // Whitelist duration
  if (!ALLOWED_BAN_DURATIONS.includes(durationDays as BanDuration)) {
    return { error: "Invalid ban duration. Allowed: 1, 7, or 30 days" };
  }

  const { databases, user, profile: adminProfile } = auth;

  const target = await getTargetProfile(databases, userId);
  if (!target) return { error: "User not found" };

  const guard = validateNotAdmin(target, user.$id);
  if (guard) return { error: guard };

  const expiresAt = new Date(
    Date.now() + durationDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  try {
    // Create warning document
    await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.USER_WARNINGS,
      ID.unique(),
      {
        userId,
        level: "temp_ban",
        reason,
        moderationItemId: moderationItemId ?? null,
        issuedBy: user.$id,
        expiresAt,
        liftedAt: null,
        liftedBy: null,
      },
    );

    // Update profile
    await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.PROFILES,
      target.$id,
      {
        banLevel: "temp_banned",
        banExpiresAt: expiresAt,
        warningCount: (target.warningCount ?? 0) + 1,
      },
    );

    // Suspend all published events by this user (if organiser)
    const { documents: publishedEvents } = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.EVENTS,
      [
        Query.equal("organiserId", userId),
        Query.equal("status", "published"),
        Query.limit(100),
      ],
    );

    for (const event of publishedEvents) {
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.EVENTS,
        event.$id,
        { status: "suspended" },
      );
    }

    // Notify user
    await createNotification({
      userId,
      type: "moderation_ban",
      title: `Your account has been temporarily banned for ${durationDays} day${durationDays > 1 ? "s" : ""}`,
      body: `Reason: ${reason}`,
      linkUrl: "/dashboard/settings",
    });

    // Audit log
    await createAuditLog({
      actorId: user.$id,
      action: "admin.user_temp_banned",
      entityType: "profile",
      entityId: target.$id,
      metadata: {
        actorName: adminProfile.displayName ?? user.name ?? "Admin",
        targetUserId: userId,
        targetName: target.displayName ?? "Unknown user",
        reason,
        durationDays,
        expiresAt,
        suspendedEventCount: publishedEvents.length,
        moderationItemId: moderationItemId ?? null,
      },
    });

    revalidatePath("/dashboard/admin/users");
    revalidatePath("/dashboard/admin/moderation");
    return { success: true };
  } catch {
    return { error: "Failed to issue temporary ban" };
  }
}

// ─── 3. Permanent Ban ───────────────────────────────

export async function permanentBanUser(
  userId: string,
  reason: string,
  moderationItemId?: string,
): Promise<{ success?: boolean; error?: string }> {
  const reasonParsed = reasonSchema.safeParse(reason);
  if (!reasonParsed.success) return { error: reasonParsed.error.issues[0].message };

  const auth = await requireAdmin();
  if (!auth) return { error: "Admin access required" };

  const { databases, user, profile: adminProfile } = auth;

  const target = await getTargetProfile(databases, userId);
  if (!target) return { error: "User not found" };

  const guard = validateNotAdmin(target, user.$id);
  if (guard) return { error: guard };

  try {
    // Create warning document
    await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.USER_WARNINGS,
      ID.unique(),
      {
        userId,
        level: "permanent_ban",
        reason,
        moderationItemId: moderationItemId ?? null,
        issuedBy: user.$id,
        expiresAt: null,
        liftedAt: null,
        liftedBy: null,
      },
    );

    // Update profile
    await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.PROFILES,
      target.$id,
      { banLevel: "permanent_banned" },
    );

    // Cancel all published/suspended events
    const { documents: activeEvents } = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.EVENTS,
      [
        Query.equal("organiserId", userId),
        Query.contains("status", ["published", "suspended"]),
        Query.limit(100),
      ],
    );

    for (const event of activeEvents) {
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.EVENTS,
        event.$id,
        { status: "cancelled" },
      );
    }

    // Void all active tickets owned by this user
    const { documents: activeTickets } = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.TICKETS,
      [
        Query.equal("ownerId", userId),
        Query.equal("status", "active"),
        Query.limit(100),
      ],
    );

    for (const ticket of activeTickets) {
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.TICKETS,
        ticket.$id,
        { status: "void" },
      );
    }

    // Notify user
    await createNotification({
      userId,
      type: "moderation_ban",
      title: "Your account has been permanently banned",
      body: `Reason: ${reason}`,
      linkUrl: "/dashboard/settings",
    });

    // Audit log
    await createAuditLog({
      actorId: user.$id,
      action: "admin.user_permanent_banned",
      entityType: "profile",
      entityId: target.$id,
      metadata: {
        actorName: adminProfile.displayName ?? user.name ?? "Admin",
        targetUserId: userId,
        targetName: target.displayName ?? "Unknown user",
        reason,
        cancelledEventCount: activeEvents.length,
        voidedTicketCount: activeTickets.length,
        moderationItemId: moderationItemId ?? null,
      },
    });

    revalidatePath("/dashboard/admin/users");
    revalidatePath("/dashboard/admin/moderation");
    return { success: true };
  } catch {
    return { error: "Failed to issue permanent ban" };
  }
}

// ─── 4. Lift Ban ────────────────────────────────────

export async function liftBan(
  warningId: string,
  reason: string,
): Promise<{ success?: boolean; error?: string }> {
  const reasonParsed = reasonSchema.safeParse(reason);
  if (!reasonParsed.success) return { error: reasonParsed.error.issues[0].message };

  const auth = await requireAdmin();
  if (!auth) return { error: "Admin access required" };

  const { databases, user, profile: adminProfile } = auth;

  try {
    const warningDoc = (await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.USER_WARNINGS,
      warningId,
    )) as unknown as UserWarningDoc;

    // Validate it's a ban that hasn't been lifted
    if (warningDoc.level === "warning") {
      return { error: "Cannot lift a warning — only bans can be lifted" };
    }
    if (warningDoc.liftedAt) {
      return { error: "This ban has already been lifted" };
    }

    const now = new Date().toISOString();

    // Mark the ban as lifted
    await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.USER_WARNINGS,
      warningId,
      {
        liftedAt: now,
        liftedBy: user.$id,
      },
    );

    // Determine new ban level by checking remaining active bans/warnings
    const { documents: remainingWarnings } = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.USER_WARNINGS,
      [
        Query.equal("userId", warningDoc.userId),
        Query.isNull("liftedAt"),
        Query.notEqual("$id", warningId),
        Query.orderDesc("$createdAt"),
        Query.limit(1),
      ],
    );

    let newBanLevel: BanLevel = "none";
    if (remainingWarnings.length > 0) {
      const latest = remainingWarnings[0] as unknown as UserWarningDoc;
      if (latest.level === "permanent_ban") {
        newBanLevel = "permanent_banned";
      } else if (
        latest.level === "temp_ban" &&
        latest.expiresAt &&
        new Date(latest.expiresAt) > new Date()
      ) {
        newBanLevel = "temp_banned";
      } else {
        newBanLevel = "warned";
      }
    }

    // Update profile
    const target = await getTargetProfile(databases, warningDoc.userId);
    if (target) {
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.PROFILES,
        target.$id,
        {
          banLevel: newBanLevel,
          banExpiresAt: null,
        },
      );
    }

    // Audit log
    await createAuditLog({
      actorId: user.$id,
      action: "admin.ban_lifted",
      entityType: "user-warning",
      entityId: warningId,
      metadata: {
        actorName: adminProfile.displayName ?? user.name ?? "Admin",
        targetUserId: warningDoc.userId,
        previousLevel: warningDoc.level,
        newBanLevel,
        reason,
      },
    });

    revalidatePath("/dashboard/admin/users");
    revalidatePath("/dashboard/admin/moderation");
    return { success: true };
  } catch {
    return { error: "Failed to lift ban" };
  }
}

// ─── 5. Get Warning History ─────────────────────────

export async function getUserWarningHistory(
  userId: string,
): Promise<UserWarningDoc[] | null> {
  const auth = await requireAdmin();
  if (!auth) return null;

  const { databases } = auth;

  const { documents } = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.USER_WARNINGS,
    [
      Query.equal("userId", userId),
      Query.orderDesc("$createdAt"),
      Query.limit(50),
    ],
  );

  return serialize(documents as unknown as UserWarningDoc[]);
}

// ─── 6. Auto-Lift Expired Ban (Helper) ──────────────

/**
 * Auto-lift expired temporary bans. Called from dashboard layout.
 * NOT a server action — uses createAdminClient directly.
 */
export async function autoLiftExpiredBan(
  profile: ProfileDoc,
): Promise<boolean> {
  if (profile.banLevel !== "temp_banned") return false;
  if (!profile.banExpiresAt) return false;
  if (new Date(profile.banExpiresAt) > new Date()) return false;

  const { databases } = await createAdminClient();

  // Find the profile doc by userId
  const target = await getTargetProfile(databases, profile.userId);
  if (!target) return false;

  await databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.PROFILES,
    target.$id,
    {
      banLevel: "none",
      banExpiresAt: null,
    },
  );

  void createAuditLog({
    actorId: null,
    action: "system.ban_auto_lifted",
    entityType: "profile",
    entityId: profile.$id,
    metadata: { userId: profile.userId, previousBanLevel: profile.banLevel },
  });

  return true;
}
