"use server";

import { ID, Query } from "node-appwrite";
import { z } from "zod/v4";
import { revalidatePath } from "next/cache";
import { createAdminClient, createSessionClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";
import { createAuditLog } from "@/lib/audit";
import { createNotification } from "@/actions/notifications";
import { liftBan } from "@/actions/warnings";
import { serialize } from "@/lib/utils";
import type {
  AppealDoc,
  AppealStatus,
  ModerationItemDoc,
  ProfileDoc,
  EventDoc,
  MessageDoc,
  UserWarningDoc,
} from "@/lib/appwrite/types";

// ─── Constants ──────────────────────────────────────────

const APPEAL_WINDOW_DAYS = 30;
const PERMANENT_BAN_APPEAL_WINDOW_DAYS = 90;

// ─── Zod Schemas ────────────────────────────────────────

const fileAppealSchema = z.object({
  moderationItemId: z.string().min(1).max(128),
  reason: z.string().min(10).max(1000),
});

const reviewAppealSchema = z.object({
  appealId: z.string().min(1).max(128),
  decision: z.enum(["upheld", "overturned"]),
  reviewNote: z.string().min(10).max(5000),
});

// ─── Auth Guard ─────────────────────────────────────────

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

// ─── Helpers ────────────────────────────────────────────

/** Resolve the affected userId from a moderation item's entity */
async function resolveAffectedUserId(
  databases: Awaited<ReturnType<typeof createAdminClient>>["databases"],
  item: ModerationItemDoc,
): Promise<string | null> {
  try {
    switch (item.entityType) {
      case "user":
        return item.entityId;

      case "event": {
        const ev = (await databases.getDocument(
          DATABASE_ID,
          COLLECTIONS.EVENTS,
          item.entityId,
        )) as unknown as EventDoc;
        return ev.organiserId;
      }

      case "message": {
        const msg = (await databases.getDocument(
          DATABASE_ID,
          COLLECTIONS.MESSAGES,
          item.entityId,
        )) as unknown as MessageDoc;
        return msg.senderId;
      }

      case "review":
        // Review entity — the userId is stored on the rating doc
        try {
          const rating = await databases.getDocument(
            DATABASE_ID,
            COLLECTIONS.EVENT_RATINGS,
            item.entityId,
          );
          return (rating as unknown as { userId: string }).userId;
        } catch {
          return null;
        }

      default:
        return null;
    }
  } catch {
    return null;
  }
}

// ─── 1. fileAppeal (User-facing) ────────────────────────

export async function fileAppeal(
  moderationItemId: string,
  reason: string,
): Promise<{ success?: boolean; appealId?: string; error?: string }> {
  const parsed = fileAppealSchema.safeParse({ moderationItemId, reason });
  if (!parsed.success) {
    return { error: "Reason must be between 10 and 1000 characters" };
  }

  const sessionClient = await createSessionClient();
  if (!sessionClient) return { error: "Authentication required" };

  const user = await sessionClient.account.get();
  const { databases } = await createAdminClient();

  // Fetch the moderation item
  let modItem: ModerationItemDoc;
  try {
    modItem = (await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.MODERATION_ITEMS,
      parsed.data.moderationItemId,
    )) as unknown as ModerationItemDoc;
  } catch {
    return { error: "Moderation item not found" };
  }

  // Must be actioned
  if (modItem.status !== "actioned") {
    return { error: "Only actioned moderation items can be appealed" };
  }

  // Verify ownership — user must be the affected party
  const affectedUserId = await resolveAffectedUserId(databases, modItem);
  if (!affectedUserId || affectedUserId !== user.$id) {
    return { error: "You can only appeal actions taken against you" };
  }

  // Check for existing appeal on this moderation item
  const { total: existingCount } = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.APPEALS,
    [
      Query.equal("moderationItemId", parsed.data.moderationItemId),
      Query.limit(1),
    ],
  );

  if (existingCount > 0) {
    return { error: "An appeal has already been filed for this moderation action" };
  }

  // Enforce time limit
  if (!modItem.resolvedAt) {
    return { error: "Moderation item has no resolution date" };
  }

  const resolvedDate = new Date(modItem.resolvedAt);
  const isPermanentBan = modItem.actionTaken?.includes("permanent_ban");
  const windowDays = isPermanentBan
    ? PERMANENT_BAN_APPEAL_WINDOW_DAYS
    : APPEAL_WINDOW_DAYS;
  const deadline = new Date(resolvedDate.getTime() + windowDays * 24 * 60 * 60 * 1000);

  if (new Date() > deadline) {
    return {
      error: `The appeal window (${windowDays} days) for this action has expired`,
    };
  }

  // Create appeal
  try {
    const appealDoc = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.APPEALS,
      ID.unique(),
      {
        moderationItemId: parsed.data.moderationItemId,
        appealerId: user.$id,
        reason: parsed.data.reason,
        status: "pending" as AppealStatus,
        reviewedBy: null,
        reviewNote: null,
        resolvedAt: null,
      },
    );

    createAuditLog({
      actorId: user.$id,
      action: "appeal.filed",
      entityType: "appeal",
      entityId: appealDoc.$id,
      metadata: {
        moderationItemId: parsed.data.moderationItemId,
      },
    });

    revalidatePath("/dashboard/admin/appeals");
    return { success: true, appealId: appealDoc.$id };
  } catch {
    return { error: "Failed to file appeal" };
  }
}

// ─── 2. reviewAppeal (Admin) ────────────────────────────

export async function reviewAppeal(
  appealId: string,
  decision: "upheld" | "overturned",
  reviewNote: string,
): Promise<{ success?: boolean; error?: string }> {
  const parsed = reviewAppealSchema.safeParse({
    appealId,
    decision,
    reviewNote,
  });
  if (!parsed.success) {
    return { error: "Review note must be between 10 and 5000 characters" };
  }

  const auth = await requireAdmin();
  if (!auth) return { error: "Admin access required" };

  const { databases, user } = auth;

  // Fetch the appeal
  let appeal: AppealDoc;
  try {
    appeal = (await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.APPEALS,
      parsed.data.appealId,
    )) as unknown as AppealDoc;
  } catch {
    return { error: "Appeal not found" };
  }

  // Must be pending or under_review
  if (appeal.status !== "pending" && appeal.status !== "under_review") {
    return { error: "This appeal has already been resolved" };
  }

  // Fetch the original moderation item
  let modItem: ModerationItemDoc;
  try {
    modItem = (await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.MODERATION_ITEMS,
      appeal.moderationItemId,
    )) as unknown as ModerationItemDoc;
  } catch {
    return { error: "Associated moderation item not found" };
  }

  // CRITICAL: Reviewer must differ from the original moderator
  if (modItem.resolvedBy === user.$id) {
    return {
      error:
        "You cannot review this appeal because you made the original moderation decision. A different admin must review it.",
    };
  }

  const now = new Date().toISOString();

  try {
    if (parsed.data.decision === "upheld") {
      // Update appeal as upheld
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.APPEALS,
        parsed.data.appealId,
        {
          status: "upheld" as AppealStatus,
          reviewedBy: user.$id,
          reviewNote: parsed.data.reviewNote,
          resolvedAt: now,
        },
      );

      // Notify the appealer
      createNotification({
        userId: appeal.appealerId,
        type: "moderation_appeal_result",
        title: "Appeal Decision: Upheld",
        body: "Your appeal was reviewed and the original decision was upheld.",
        linkUrl: "/dashboard/appeals",
      });

      createAuditLog({
        actorId: user.$id,
        action: "admin.appeal_upheld",
        entityType: "appeal",
        entityId: parsed.data.appealId,
        metadata: {
          moderationItemId: appeal.moderationItemId,
          reviewNote: parsed.data.reviewNote,
        },
      });
    } else {
      // Decision: overturned — reverse the original action
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.APPEALS,
        parsed.data.appealId,
        {
          status: "overturned" as AppealStatus,
          reviewedBy: user.$id,
          reviewNote: parsed.data.reviewNote,
          resolvedAt: now,
        },
      );

      // Reverse the original moderation action
      await reverseAction(databases, modItem, user.$id);

      // Notify the appealer
      createNotification({
        userId: appeal.appealerId,
        type: "moderation_appeal_result",
        title: "Appeal Decision: Overturned",
        body: "Your appeal was successful. The action has been reversed.",
        linkUrl: "/dashboard/appeals",
      });

      createAuditLog({
        actorId: user.$id,
        action: "admin.appeal_overturned",
        entityType: "appeal",
        entityId: parsed.data.appealId,
        metadata: {
          moderationItemId: appeal.moderationItemId,
          actionReversed: modItem.actionTaken,
          reviewNote: parsed.data.reviewNote,
        },
      });
    }

    revalidatePath("/dashboard/admin/appeals");
    revalidatePath("/dashboard/appeals");
    return { success: true };
  } catch {
    return { error: "Failed to process appeal decision" };
  }
}

// ─── Reverse Action Helper ──────────────────────────────

async function reverseAction(
  databases: Awaited<ReturnType<typeof createAdminClient>>["databases"],
  modItem: ModerationItemDoc,
  adminUserId: string,
): Promise<void> {
  const actionTaken = modItem.actionTaken ?? "";

  // Resolve the affected user
  const affectedUserId = await resolveAffectedUserId(databases, modItem);

  // If the action involved a warning, remove the latest warning for this moderation item
  if (actionTaken.includes("warned") && affectedUserId) {
    const { documents: warnings } = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.USER_WARNINGS,
      [
        Query.equal("userId", affectedUserId),
        Query.equal("level", "warning"),
        Query.isNull("liftedAt"),
        Query.orderDesc("$createdAt"),
        Query.limit(5),
      ],
    );

    // Find the warning linked to this moderation item, or the most recent one
    const targetWarning = warnings.find(
      (w) => (w as unknown as UserWarningDoc).moderationItemId === modItem.$id,
    ) ?? warnings[0];

    if (targetWarning) {
      const now = new Date().toISOString();
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.USER_WARNINGS,
        targetWarning.$id,
        {
          liftedAt: now,
          liftedBy: adminUserId,
        },
      );

      // Recalculate warning count and ban level
      await recalculateUserModerationState(databases, affectedUserId);
    }
  }

  // If the action involved a ban, use liftBan
  if (
    (actionTaken.includes("temp_ban") || actionTaken.includes("permanent_ban")) &&
    affectedUserId
  ) {
    // Find the ban warning linked to this moderation item
    const banLevel = actionTaken.includes("permanent_ban")
      ? "permanent_ban"
      : "temp_ban";

    const { documents: banWarnings } = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.USER_WARNINGS,
      [
        Query.equal("userId", affectedUserId),
        Query.equal("level", banLevel),
        Query.isNull("liftedAt"),
        Query.orderDesc("$createdAt"),
        Query.limit(5),
      ],
    );

    const targetBan = banWarnings.find(
      (w) => (w as unknown as UserWarningDoc).moderationItemId === modItem.$id,
    ) ?? banWarnings[0];

    if (targetBan) {
      await liftBan(targetBan.$id, "Appeal overturned — ban reversed");
    }
  }

  // If the action suspended an event, reinstate it
  if (actionTaken.includes("event_suspended") && modItem.entityType === "event") {
    try {
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.EVENTS,
        modItem.entityId,
        { status: "published" },
      );

      // Notify event organiser about reinstatement
      const ev = (await databases.getDocument(
        DATABASE_ID,
        COLLECTIONS.EVENTS,
        modItem.entityId,
      )) as unknown as EventDoc;

      createNotification({
        userId: ev.organiserId,
        type: "event_reinstated",
        title: "Event Reinstated",
        body: `Your event "${ev.title}" has been reinstated following a successful appeal.`,
        linkUrl: `/events/${modItem.entityId}`,
      });
    } catch {
      // Event may have been deleted
    }
  }
}

/** Recalculate warningCount and banLevel after a warning is lifted */
async function recalculateUserModerationState(
  databases: Awaited<ReturnType<typeof createAdminClient>>["databases"],
  userId: string,
): Promise<void> {
  const { documents: activeWarnings } = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.USER_WARNINGS,
    [
      Query.equal("userId", userId),
      Query.isNull("liftedAt"),
      Query.limit(100),
    ],
  );

  const warningCount = activeWarnings.length;

  // Determine ban level from active warnings
  let banLevel: "none" | "warned" | "temp_banned" | "permanent_banned" = "none";
  for (const w of activeWarnings) {
    const warning = w as unknown as UserWarningDoc;
    if (warning.level === "permanent_ban") {
      banLevel = "permanent_banned";
      break;
    }
    if (warning.level === "temp_ban") {
      banLevel = "temp_banned";
    }
    if (warning.level === "warning" && banLevel === "none") {
      banLevel = "warned";
    }
  }

  // Find the user's profile
  const { documents: profiles } = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.PROFILES,
    [Query.equal("userId", userId), Query.limit(1)],
  );

  if (profiles[0]) {
    await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.PROFILES,
      profiles[0].$id,
      { warningCount, banLevel },
    );
  }
}

// ─── 3. listAppeals (Admin) ─────────────────────────────

export interface AppealListItem extends AppealDoc {
  entityType: string;
  moderationReason: string;
}

export async function listAppeals(
  status?: AppealStatus,
  page = 1,
  limit = 20,
): Promise<{ appeals: AppealListItem[]; total: number }> {
  const auth = await requireAdmin();
  if (!auth) return { appeals: [], total: 0 };

  const { databases } = auth;
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const offset = (Math.max(page, 1) - 1) * safeLimit;

  const queries: string[] = [
    Query.orderDesc("$createdAt"),
    Query.limit(safeLimit),
    Query.offset(offset),
  ];

  if (status) {
    queries.push(Query.equal("status", status));
  }

  const result = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.APPEALS,
    queries,
  );

  const appeals = result.documents as unknown as AppealDoc[];

  // Enrich each appeal with moderation item context
  const enriched: AppealListItem[] = await Promise.all(
    appeals.map(async (appeal) => {
      let entityType = "unknown";
      let moderationReason = "unknown";

      try {
        const modItem = (await databases.getDocument(
          DATABASE_ID,
          COLLECTIONS.MODERATION_ITEMS,
          appeal.moderationItemId,
        )) as unknown as ModerationItemDoc;
        entityType = modItem.entityType;
        moderationReason = modItem.reason;
      } catch {
        // Moderation item may have been removed
      }

      return serialize({
        ...appeal,
        entityType,
        moderationReason,
      }) as AppealListItem;
    }),
  );

  return serialize({ appeals: enriched, total: result.total });
}

// ─── 4. getAppealDetail (Admin) ─────────────────────────

export interface AppealDetail {
  appeal: AppealDoc;
  moderationItem: ModerationItemDoc | null;
  entityContext: {
    type: string;
    label: string;
    detail: string | null;
  };
  originalModeratorName: string | null;
  appealerName: string | null;
}

export async function getAppealDetail(
  appealId: string,
): Promise<AppealDetail | null> {
  const auth = await requireAdmin();
  if (!auth) return null;

  const { databases } = auth;

  // Fetch appeal
  let appeal: AppealDoc;
  try {
    appeal = (await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.APPEALS,
      appealId,
    )) as unknown as AppealDoc;
  } catch {
    return null;
  }

  // Fetch moderation item
  let modItem: ModerationItemDoc | null = null;
  try {
    modItem = (await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.MODERATION_ITEMS,
      appeal.moderationItemId,
    )) as unknown as ModerationItemDoc;
  } catch {
    // May have been removed
  }

  // Resolve entity context
  let entityLabel = "Unknown";
  let entityDetail: string | null = null;
  const entityType = modItem?.entityType ?? "unknown";

  if (modItem) {
    try {
      switch (modItem.entityType) {
        case "event": {
          const ev = (await databases.getDocument(
            DATABASE_ID,
            COLLECTIONS.EVENTS,
            modItem.entityId,
          )) as unknown as EventDoc;
          entityLabel = ev.title;
          entityDetail = ev.description;
          break;
        }
        case "user": {
          const { documents } = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.PROFILES,
            [Query.equal("userId", modItem.entityId), Query.limit(1)],
          );
          const prof = documents[0] as unknown as ProfileDoc | undefined;
          entityLabel = prof?.displayName ?? "Unknown user";
          entityDetail = prof?.bio ?? null;
          break;
        }
        case "message": {
          const msg = (await databases.getDocument(
            DATABASE_ID,
            COLLECTIONS.MESSAGES,
            modItem.entityId,
          )) as unknown as MessageDoc;
          entityLabel = "Message";
          entityDetail =
            msg.body.length > 200 ? msg.body.slice(0, 200) + "..." : msg.body;
          break;
        }
        case "review": {
          try {
            const rating = await databases.getDocument(
              DATABASE_ID,
              COLLECTIONS.EVENT_RATINGS,
              modItem.entityId,
            );
            entityLabel = "Review";
            entityDetail = (rating as unknown as { comment: string | null }).comment;
          } catch {
            entityLabel = "Review (deleted)";
          }
          break;
        }
      }
    } catch {
      // Entity may have been deleted
    }
  }

  // Fetch original moderator name
  let originalModeratorName: string | null = null;
  if (modItem?.resolvedBy) {
    try {
      const { documents } = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.PROFILES,
        [Query.equal("userId", modItem.resolvedBy), Query.limit(1)],
      );
      const modProfile = documents[0] as unknown as ProfileDoc | undefined;
      originalModeratorName = modProfile?.displayName ?? null;
    } catch {
      // Moderator profile may not exist
    }
  }

  // Fetch appealer name
  let appealerName: string | null = null;
  try {
    const { documents } = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PROFILES,
      [Query.equal("userId", appeal.appealerId), Query.limit(1)],
    );
    const appealerProfile = documents[0] as unknown as ProfileDoc | undefined;
    appealerName = appealerProfile?.displayName ?? null;
  } catch {
    // Appealer profile may not exist
  }

  return serialize({
    appeal,
    moderationItem: modItem,
    entityContext: {
      type: entityType,
      label: entityLabel,
      detail: entityDetail,
    },
    originalModeratorName,
    appealerName,
  });
}

// ─── 5. getMyAppeals (User-facing) ──────────────────────

export interface MyAppealItem extends AppealDoc {
  entityType: string;
  moderationReason: string;
  actionTaken: string | null;
}

export async function getMyAppeals(): Promise<MyAppealItem[]> {
  const sessionClient = await createSessionClient();
  if (!sessionClient) return [];

  const user = await sessionClient.account.get();
  const { databases } = await createAdminClient();

  const { documents } = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.APPEALS,
    [
      Query.equal("appealerId", user.$id),
      Query.orderDesc("$createdAt"),
      Query.limit(50),
    ],
  );

  const appeals = documents as unknown as AppealDoc[];

  const enriched: MyAppealItem[] = await Promise.all(
    appeals.map(async (appeal) => {
      let entityType = "unknown";
      let moderationReason = "unknown";
      let actionTaken: string | null = null;

      try {
        const modItem = (await databases.getDocument(
          DATABASE_ID,
          COLLECTIONS.MODERATION_ITEMS,
          appeal.moderationItemId,
        )) as unknown as ModerationItemDoc;
        entityType = modItem.entityType;
        moderationReason = modItem.reason;
        actionTaken = modItem.actionTaken;
      } catch {
        // Moderation item may have been removed
      }

      return serialize({
        ...appeal,
        entityType,
        moderationReason,
        actionTaken,
      }) as MyAppealItem;
    }),
  );

  return enriched;
}
