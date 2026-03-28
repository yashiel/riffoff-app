"use server";

import { ID, Query } from "node-appwrite";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAdminClient, createSessionClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";
import { createAuditLog } from "@/lib/audit";
import { serialize } from "@/lib/utils";
import type {
  ProfileDoc,
  EventDoc,
  MessageDoc,
  ModerationItemDoc,
  ModerationNoteDoc,
  ModerationEntityType,
  ModerationReason,
  ModerationPriority,
  ModerationStatus,
} from "@/lib/appwrite/types";

// ─── Constants ──────────────────────────────────────────

const PRIORITY_MAP: Record<ModerationReason, ModerationPriority> = {
  spam: "low",
  inappropriate: "medium",
  duplicate: "low",
  wrong_info: "medium",
  sold_out_misleading: "medium",
  cancelled_unlisted: "high",
  unofficial: "high",
  other: "low",
  harassment: "high",
  fraud: "high",
  scam: "critical",
  impersonation: "critical",
};

const PRIORITY_ORDER: Record<ModerationPriority, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

const MAX_BULK = 50;
const REPORTS_RATE_LIMIT = 10;
const REPORTS_RATE_WINDOW_HOURS = 24;
const ESCALATION_THRESHOLD = 3;

// ─── Zod Schemas ────────────────────────────────────────

const submitReportSchema = z.object({
  entityType: z.enum(["event", "user", "message", "review"]),
  entityId: z.string().min(1).max(128),
  reason: z.enum([
    "spam",
    "fraud",
    "harassment",
    "inappropriate",
    "duplicate",
    "scam",
    "impersonation",
    "wrong_info",
    "sold_out_misleading",
    "cancelled_unlisted",
    "unofficial",
    "other",
  ]),
  description: z.string().max(500).optional(),
});

const addNoteSchema = z.object({
  itemId: z.string().min(1).max(128),
  body: z.string().min(1).max(5000),
});

const bulkIdsSchema = z
  .array(z.string().min(1).max(128))
  .min(1)
  .max(MAX_BULK);

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

function bumpPriority(current: ModerationPriority): ModerationPriority {
  const order = PRIORITY_ORDER[current];
  if (order >= PRIORITY_ORDER.critical) return "critical";
  const entries = Object.entries(PRIORITY_ORDER) as [ModerationPriority, number][];
  const next = entries.find(([, v]) => v === order + 1);
  return next ? next[0] : "critical";
}

// ─── 1. submitReport (User-facing) ─────────────────────

export async function submitReport(
  entityType: ModerationEntityType,
  entityId: string,
  reason: ModerationReason,
  description?: string,
): Promise<{ success?: boolean; error?: string }> {
  // Validate input
  const parsed = submitReportSchema.safeParse({
    entityType,
    entityId,
    reason,
    description,
  });
  if (!parsed.success) {
    return { error: "Invalid report data" };
  }

  // Auth
  const sessionClient = await createSessionClient();
  if (!sessionClient) return { error: "Authentication required" };

  const user = await sessionClient.account.get();
  const { databases } = await createAdminClient();

  // Rate limit: max 10 reports in 24h
  const windowStart = new Date(
    Date.now() - REPORTS_RATE_WINDOW_HOURS * 60 * 60 * 1000,
  ).toISOString();

  const { total: recentCount } = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.MODERATION_ITEMS,
    [
      Query.equal("reporterId", user.$id),
      Query.greaterThanEqual("$createdAt", windowStart),
      Query.limit(1),
    ],
  );

  if (recentCount >= REPORTS_RATE_LIMIT) {
    return { error: "You have reached the maximum number of reports. Please try again later." };
  }

  // Duplicate check: same reporter + same entity
  const { total: dupeCount } = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.MODERATION_ITEMS,
    [
      Query.equal("reporterId", user.$id),
      Query.equal("entityType", parsed.data.entityType),
      Query.equal("entityId", parsed.data.entityId),
      Query.limit(1),
    ],
  );

  if (dupeCount > 0) {
    return { error: "You have already reported this item" };
  }

  // Determine priority
  let priority = PRIORITY_MAP[parsed.data.reason];

  // Check if entity has 3+ open reports → escalate to "high"
  const { total: openReportCount } = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.MODERATION_ITEMS,
    [
      Query.equal("entityType", parsed.data.entityType),
      Query.equal("entityId", parsed.data.entityId),
      Query.equal("status", "open"),
      Query.limit(1),
    ],
  );

  if (openReportCount >= ESCALATION_THRESHOLD) {
    if (PRIORITY_ORDER[priority] < PRIORITY_ORDER.high) {
      priority = "high";
    }
  }

  // Check if reporter is Guardian → bump priority one level
  const { documents: reporterDocs } = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.PROFILES,
    [Query.equal("userId", user.$id), Query.limit(1)],
  );
  const reporterProfile = reporterDocs[0] as unknown as ProfileDoc | undefined;

  if (reporterProfile?.communityRole === "guardian") {
    priority = bumpPriority(priority);
  }

  // Create moderation item
  try {
    await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.MODERATION_ITEMS,
      ID.unique(),
      {
        entityType: parsed.data.entityType,
        entityId: parsed.data.entityId,
        source: "user",
        reporterId: user.$id,
        reason: parsed.data.reason,
        description: parsed.data.description ?? null,
        status: "open",
        priority,
        assignedTo: null,
        actionTaken: null,
        resolvedAt: null,
        resolvedBy: null,
      },
    );

    // Fire-and-forget audit log
    createAuditLog({
      actorId: user.$id,
      action: "moderation.report_submitted",
      entityType: parsed.data.entityType,
      entityId: parsed.data.entityId,
      metadata: { reason: parsed.data.reason, priority },
    });

    return { success: true };
  } catch {
    return { error: "Failed to submit report" };
  }
}

// ─── 2. listModerationQueue (Admin) ────────────────────

export interface ModerationQueueResult {
  items: ModerationItemDoc[];
  total: number;
}

export async function listModerationQueue(
  status?: ModerationStatus,
  priority?: ModerationPriority,
  entityType?: ModerationEntityType,
  page = 1,
  limit = 20,
): Promise<ModerationQueueResult> {
  const auth = await requireAdmin();
  if (!auth) return { items: [], total: 0 };

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
  if (priority) {
    queries.push(Query.equal("priority", priority));
  }
  if (entityType) {
    queries.push(Query.equal("entityType", entityType));
  }

  const result = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.MODERATION_ITEMS,
    queries,
  );

  return serialize({
    items: result.documents as unknown as ModerationItemDoc[],
    total: result.total,
  });
}

// ─── 3. getModerationDetail (Admin) ────────────────────

export interface ModerationDetail {
  item: ModerationItemDoc;
  entityPreview: {
    type: ModerationEntityType;
    label: string;
    detail: string | null;
  };
  relatedReports: ModerationItemDoc[];
  notes: ModerationNoteDoc[];
}

export async function getModerationDetail(
  itemId: string,
): Promise<ModerationDetail | null> {
  const auth = await requireAdmin();
  if (!auth) return null;

  const { databases } = auth;

  // Fetch the item
  let item: ModerationItemDoc;
  try {
    item = (await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.MODERATION_ITEMS,
      itemId,
    )) as unknown as ModerationItemDoc;
  } catch {
    return null;
  }

  // Fetch entity preview based on type
  let label = "Unknown";
  let detail: string | null = null;

  try {
    switch (item.entityType) {
      case "event": {
        const ev = (await databases.getDocument(
          DATABASE_ID,
          COLLECTIONS.EVENTS,
          item.entityId,
        )) as unknown as EventDoc;
        label = ev.title;
        detail = ev.description;
        break;
      }
      case "user": {
        const { documents } = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.PROFILES,
          [Query.equal("userId", item.entityId), Query.limit(1)],
        );
        const prof = documents[0] as unknown as ProfileDoc | undefined;
        label = prof?.displayName ?? "Unknown user";
        detail = prof?.bio ?? null;
        break;
      }
      case "message": {
        const msg = (await databases.getDocument(
          DATABASE_ID,
          COLLECTIONS.MESSAGES,
          item.entityId,
        )) as unknown as MessageDoc;
        label = "Message";
        detail = msg.body.length > 200 ? msg.body.slice(0, 200) + "..." : msg.body;
        break;
      }
      case "review": {
        // Event ratings collection
        try {
          const rating = await databases.getDocument(
            DATABASE_ID,
            COLLECTIONS.EVENT_RATINGS,
            item.entityId,
          );
          label = "Review";
          detail = (rating as unknown as { comment: string | null }).comment;
        } catch {
          label = "Review (deleted)";
        }
        break;
      }
    }
  } catch {
    // Entity may have been deleted — keep defaults
  }

  // Fetch related reports on same entity
  const { documents: relatedDocs } = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.MODERATION_ITEMS,
    [
      Query.equal("entityType", item.entityType),
      Query.equal("entityId", item.entityId),
      Query.notEqual("$id", item.$id),
      Query.orderDesc("$createdAt"),
      Query.limit(20),
    ],
  );

  // Fetch notes
  const { documents: noteDocs } = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.MODERATION_NOTES,
    [
      Query.equal("moderationItemId", itemId),
      Query.orderDesc("$createdAt"),
      Query.limit(50),
    ],
  );

  return serialize({
    item,
    entityPreview: { type: item.entityType, label, detail },
    relatedReports: relatedDocs as unknown as ModerationItemDoc[],
    notes: noteDocs as unknown as ModerationNoteDoc[],
  });
}

// ─── 4. assignModerationItem (Admin) ───────────────────

export async function assignModerationItem(
  itemId: string,
): Promise<{ error?: string }> {
  const auth = await requireAdmin();
  if (!auth) return { error: "Admin access required" };

  const { databases, user } = auth;

  try {
    await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.MODERATION_ITEMS,
      itemId,
      {
        assignedTo: user.$id,
        status: "in_review",
      },
    );

    createAuditLog({
      actorId: user.$id,
      action: "moderation.item_assigned",
      entityType: "moderation-item",
      entityId: itemId,
      metadata: { assignedTo: user.$id },
    });

    revalidatePath("/dashboard/admin/moderation");
    return {};
  } catch {
    return { error: "Failed to assign item" };
  }
}

// ─── 5. dismissModerationItem (Admin) ──────────────────

const dismissNoteSchema = z.string().min(1, "Dismissal note is required").max(5000, "Note too long");

export async function dismissModerationItem(
  itemId: string,
  note: string,
): Promise<{ error?: string }> {
  const auth = await requireAdmin();
  if (!auth) return { error: "Admin access required" };

  const noteParsed = dismissNoteSchema.safeParse(note);
  if (!noteParsed.success) {
    return { error: noteParsed.error.issues[0]?.message ?? "Invalid note" };
  }

  const { databases, user } = auth;

  try {
    const now = new Date().toISOString();

    await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.MODERATION_ITEMS,
      itemId,
      {
        status: "dismissed",
        resolvedAt: now,
        resolvedBy: user.$id,
      },
    );

    // Create dismissal note
    if (note.trim()) {
      await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.MODERATION_NOTES,
        ID.unique(),
        {
          moderationItemId: itemId,
          authorId: user.$id,
          body: note,
        },
      );
    }

    createAuditLog({
      actorId: user.$id,
      action: "moderation.item_dismissed",
      entityType: "moderation-item",
      entityId: itemId,
      metadata: { note },
    });

    revalidatePath("/dashboard/admin/moderation");
    return {};
  } catch {
    return { error: "Failed to dismiss item" };
  }
}

// ─── 6. actionModerationItem (Admin) ───────────────────

const ALLOWED_ACTION_TYPES = [
  "warn_user",
  "temp_ban_1d",
  "temp_ban_7d",
  "temp_ban_30d",
  "permanent_ban",
  "event_suspended",
  "event_reinstated",
  "content_deleted",
  "dismissed",
] as const;

type AllowedActionType = (typeof ALLOWED_ACTION_TYPES)[number];

const actionMetadataSchema = z.object({
  reason: z.string().max(1000).optional(),
  days: z.number().int().min(1).max(30).optional(),
});

export async function actionModerationItem(
  itemId: string,
  actionType: string,
  params?: { reason?: string; days?: number },
): Promise<{ error?: string }> {
  const auth = await requireAdmin();
  if (!auth) return { error: "Admin access required" };

  const { databases, user } = auth;

  if (!ALLOWED_ACTION_TYPES.includes(actionType as AllowedActionType)) {
    return { error: "Invalid action type" };
  }

  const metaParsed = actionMetadataSchema.safeParse(params ?? {});
  if (!metaParsed.success) {
    return { error: "Invalid action parameters" };
  }

  try {
    const now = new Date().toISOString();

    await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.MODERATION_ITEMS,
      itemId,
      {
        status: "actioned",
        actionTaken: actionType,
        resolvedAt: now,
        resolvedBy: user.$id,
      },
    );

    createAuditLog({
      actorId: user.$id,
      action: "moderation.item_actioned",
      entityType: "moderation-item",
      entityId: itemId,
      metadata: { actionType, reason: metaParsed.data.reason, days: metaParsed.data.days },
    });

    revalidatePath("/dashboard/admin/moderation");
    return {};
  } catch {
    return { error: "Failed to action item" };
  }
}

// ─── 7. addModerationNote (Admin) ──────────────────────

export async function addModerationNote(
  itemId: string,
  body: string,
): Promise<{ error?: string }> {
  const auth = await requireAdmin();
  if (!auth) return { error: "Admin access required" };

  const parsed = addNoteSchema.safeParse({ itemId, body });
  if (!parsed.success) {
    return { error: "Note must be between 1 and 5000 characters" };
  }

  const { databases, user } = auth;

  try {
    await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.MODERATION_NOTES,
      ID.unique(),
      {
        moderationItemId: parsed.data.itemId,
        authorId: user.$id,
        body: parsed.data.body,
      },
    );

    createAuditLog({
      actorId: user.$id,
      action: "moderation.note_added",
      entityType: "moderation-item",
      entityId: parsed.data.itemId,
    });

    revalidatePath("/dashboard/admin/moderation");
    return {};
  } catch {
    return { error: "Failed to add note" };
  }
}

// ─── 8. bulkDismiss (Admin) ────────────────────────────

export async function bulkDismiss(
  itemIds: string[],
): Promise<{ count: number; error?: string }> {
  const auth = await requireAdmin();
  if (!auth) return { count: 0, error: "Admin access required" };

  const parsed = bulkIdsSchema.safeParse(itemIds);
  if (!parsed.success) {
    return { count: 0, error: `Provide 1-${MAX_BULK} item IDs` };
  }

  const { databases, user } = auth;
  const now = new Date().toISOString();
  let count = 0;

  for (const id of parsed.data) {
    try {
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.MODERATION_ITEMS,
        id,
        {
          status: "dismissed",
          resolvedAt: now,
          resolvedBy: user.$id,
        },
      );
      count++;
    } catch {
      // Skip individual failures, continue processing
    }
  }

  if (count > 0) {
    createAuditLog({
      actorId: user.$id,
      action: "moderation.bulk_dismissed",
      entityType: "moderation-item",
      entityId: parsed.data.join(","),
      metadata: { count, total: parsed.data.length },
    });

    revalidatePath("/dashboard/admin/moderation");
  }

  return { count };
}

// ─── 9. bulkAssign (Admin) ─────────────────────────────

export async function bulkAssign(
  itemIds: string[],
): Promise<{ count: number; error?: string }> {
  const auth = await requireAdmin();
  if (!auth) return { count: 0, error: "Admin access required" };

  const parsed = bulkIdsSchema.safeParse(itemIds);
  if (!parsed.success) {
    return { count: 0, error: `Provide 1-${MAX_BULK} item IDs` };
  }

  const { databases, user } = auth;
  let count = 0;

  for (const id of parsed.data) {
    try {
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.MODERATION_ITEMS,
        id,
        {
          assignedTo: user.$id,
          status: "in_review",
        },
      );
      count++;
    } catch {
      // Skip individual failures
    }
  }

  if (count > 0) {
    createAuditLog({
      actorId: user.$id,
      action: "moderation.bulk_assigned",
      entityType: "moderation-item",
      entityId: parsed.data.join(","),
      metadata: { assignedTo: user.$id, count, total: parsed.data.length },
    });

    revalidatePath("/dashboard/admin/moderation");
  }

  return { count };
}

// ─── 10. bulkChangePriority (Admin) ────────────────────

export async function bulkChangePriority(
  itemIds: string[],
  priority: ModerationPriority,
): Promise<{ count: number; error?: string }> {
  const auth = await requireAdmin();
  if (!auth) return { count: 0, error: "Admin access required" };

  const parsed = bulkIdsSchema.safeParse(itemIds);
  if (!parsed.success) {
    return { count: 0, error: `Provide 1-${MAX_BULK} item IDs` };
  }

  const validPriorities: ModerationPriority[] = ["low", "medium", "high", "critical"];
  if (!validPriorities.includes(priority)) {
    return { count: 0, error: "Invalid priority level" };
  }

  const { databases, user } = auth;
  let count = 0;

  for (const id of parsed.data) {
    try {
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.MODERATION_ITEMS,
        id,
        { priority },
      );
      count++;
    } catch {
      // Skip individual failures
    }
  }

  if (count > 0) {
    createAuditLog({
      actorId: user.$id,
      action: "moderation.bulk_priority_changed",
      entityType: "moderation-item",
      entityId: parsed.data.join(","),
      metadata: { priority, count, total: parsed.data.length },
    });

    revalidatePath("/dashboard/admin/moderation");
  }

  return { count };
}

// ─── 11. getModerationStats (Admin) ────────────────────

export interface ModerationStats {
  open: number;
  critical: number;
  inReview: number;
  actionedThisMonth: number;
  dismissedThisMonth: number;
}

export async function getModerationStats(): Promise<ModerationStats | null> {
  const auth = await requireAdmin();
  if (!auth) return null;

  const { databases } = auth;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [open, critical, inReview, actionedThisMonth, dismissedThisMonth] =
    await Promise.all([
      databases.listDocuments(DATABASE_ID, COLLECTIONS.MODERATION_ITEMS, [
        Query.equal("status", "open"),
        Query.limit(1),
      ]),
      databases.listDocuments(DATABASE_ID, COLLECTIONS.MODERATION_ITEMS, [
        Query.equal("priority", "critical"),
        Query.equal("status", "open"),
        Query.limit(1),
      ]),
      databases.listDocuments(DATABASE_ID, COLLECTIONS.MODERATION_ITEMS, [
        Query.equal("status", "in_review"),
        Query.limit(1),
      ]),
      databases.listDocuments(DATABASE_ID, COLLECTIONS.MODERATION_ITEMS, [
        Query.equal("status", "actioned"),
        Query.greaterThanEqual("resolvedAt", monthStart),
        Query.limit(1),
      ]),
      databases.listDocuments(DATABASE_ID, COLLECTIONS.MODERATION_ITEMS, [
        Query.equal("status", "dismissed"),
        Query.greaterThanEqual("resolvedAt", monthStart),
        Query.limit(1),
      ]),
    ]);

  return {
    open: open.total,
    critical: critical.total,
    inReview: inReview.total,
    actionedThisMonth: actionedThisMonth.total,
    dismissedThisMonth: dismissedThisMonth.total,
  };
}
