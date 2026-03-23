"use server";

import { ID, Query } from "node-appwrite";
import { revalidatePath } from "next/cache";
import { createAdminClient, createSessionClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";
import type {
  ProfileDoc,
  EventDoc,
  UserRole,
  AuditLogDoc,
} from "@/lib/appwrite/types";

// ─── Auth Guard ──────────────────────────────────────

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

// ─── Platform Stats ──────────────────────────────────

export interface PlatformStats {
  totalUsers: number;
  totalEvents: number;
  publishedEvents: number;
  totalTickets: number;
  totalRevenue: number;
  checkedIn: number;
}

export async function getPlatformStats(): Promise<PlatformStats | null> {
  const auth = await requireAdmin();
  if (!auth) return null;

  const { databases } = auth;

  const [users, events, published, tickets, checkedIn] = await Promise.all([
    databases.listDocuments(DATABASE_ID, COLLECTIONS.PROFILES, [Query.limit(1)]),
    databases.listDocuments(DATABASE_ID, COLLECTIONS.EVENTS, [Query.limit(1)]),
    databases.listDocuments(DATABASE_ID, COLLECTIONS.EVENTS, [
      Query.equal("status", "published"),
      Query.limit(1),
    ]),
    databases.listDocuments(DATABASE_ID, COLLECTIONS.TICKETS, [Query.limit(1)]),
    databases.listDocuments(DATABASE_ID, COLLECTIONS.TICKETS, [
      Query.isNotNull("checkedInAt"),
      Query.limit(1),
    ]),
  ]);

  return {
    totalUsers: users.total,
    totalEvents: events.total,
    publishedEvents: published.total,
    totalTickets: tickets.total,
    totalRevenue: 0, // Calculated from orders in production
    checkedIn: checkedIn.total,
  };
}

// ─── User Management ─────────────────────────────────

export interface AdminUserRow {
  profileId: string;
  userId: string;
  displayName: string | null;
  role: UserRole;
  createdAt: string;
}

export async function listUsers(
  page = 1,
  search?: string,
): Promise<{ users: AdminUserRow[]; total: number }> {
  const auth = await requireAdmin();
  if (!auth) return { users: [], total: 0 };

  const { databases } = auth;
  const limit = 20;
  const offset = (page - 1) * limit;

  const queries = [
    Query.orderDesc("$createdAt"),
    Query.limit(limit),
    Query.offset(offset),
  ];

  if (search) {
    queries.push(Query.search("displayName", search));
  }

  const result = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.PROFILES,
    queries,
  );

  const users: AdminUserRow[] = result.documents.map((doc) => {
    const profile = doc as unknown as ProfileDoc;
    return {
      profileId: profile.$id,
      userId: profile.userId,
      displayName: profile.displayName,
      role: profile.role,
      createdAt: profile.$createdAt,
    };
  });

  return { users, total: result.total };
}

/** Change a user's role (admin only) */
export async function changeUserRole(
  profileId: string,
  newRole: UserRole,
): Promise<{ error?: string }> {
  const auth = await requireAdmin();
  if (!auth) return { error: "Admin access required" };

  const { databases, user } = auth;

  // Can't change own role
  const target = (await databases.getDocument(
    DATABASE_ID,
    COLLECTIONS.PROFILES,
    profileId,
  )) as unknown as ProfileDoc;

  if (target.userId === user.$id) {
    return { error: "Cannot change your own role" };
  }

  try {
    await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.PROFILES,
      profileId,
      { role: newRole },
    );

    // Audit log
    await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.AUDIT_LOGS,
      ID.unique(),
      {
        actorId: user.$id,
        action: "admin.role_change",
        entityType: "profile",
        entityId: profileId,
        metadata: JSON.stringify({
          targetUserId: target.userId,
          previousRole: target.role,
          newRole,
        }),
      },
    );

    revalidatePath("/dashboard/admin/users");
    return {};
  } catch {
    return { error: "Failed to change role" };
  }
}

// ─── Event Moderation ────────────────────────────────

export interface AdminEventRow {
  eventId: string;
  title: string;
  organiserId: string;
  organiserName: string | null;
  status: string;
  startsAt: string;
  createdAt: string;
}

export async function listAllEvents(
  page = 1,
  statusFilter?: string,
): Promise<{ events: AdminEventRow[]; total: number }> {
  const auth = await requireAdmin();
  if (!auth) return { events: [], total: 0 };

  const { databases } = auth;
  const limit = 20;
  const offset = (page - 1) * limit;

  const queries = [
    Query.orderDesc("$createdAt"),
    Query.limit(limit),
    Query.offset(offset),
  ];

  if (statusFilter && statusFilter !== "all") {
    queries.push(Query.equal("status", statusFilter));
  }

  const result = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.EVENTS,
    queries,
  );

  const events = result.documents as unknown as EventDoc[];

  // Fetch organiser names
  const organiserIds = [...new Set(events.map((e) => e.organiserId))];
  const nameMap = new Map<string, string>();

  if (organiserIds.length > 0) {
    const profiles = await Promise.all(
      organiserIds.map((id) =>
        databases
          .listDocuments(DATABASE_ID, COLLECTIONS.PROFILES, [
            Query.equal("userId", id),
            Query.limit(1),
          ])
          .then((r) => (r.documents[0] as unknown as ProfileDoc) ?? null)
          .catch(() => null),
      ),
    );
    for (const p of profiles) {
      if (p) nameMap.set(p.userId, p.displayName ?? "Unknown");
    }
  }

  return {
    events: events.map((e) => ({
      eventId: e.$id,
      title: e.title,
      organiserId: e.organiserId,
      organiserName: nameMap.get(e.organiserId) ?? "Unknown",
      status: e.status,
      startsAt: e.startsAt,
      createdAt: e.$createdAt,
    })),
    total: result.total,
  };
}

/** Force-cancel an event (admin moderation) */
export async function adminCancelEvent(
  eventId: string,
  reason: string,
): Promise<{ error?: string }> {
  const auth = await requireAdmin();
  if (!auth) return { error: "Admin access required" };

  const { databases, user } = auth;

  try {
    await databases.updateDocument(DATABASE_ID, COLLECTIONS.EVENTS, eventId, {
      status: "cancelled",
    });

    await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.AUDIT_LOGS,
      ID.unique(),
      {
        actorId: user.$id,
        action: "admin.event_cancelled",
        entityType: "event",
        entityId: eventId,
        metadata: JSON.stringify({ reason }),
      },
    );

    revalidatePath("/dashboard/admin/events");
    return {};
  } catch {
    return { error: "Failed to cancel event" };
  }
}

// ─── Audit Log ───────────────────────────────────────

export async function getAuditLogs(
  page = 1,
  actionFilter?: string,
): Promise<{ logs: AuditLogDoc[]; total: number }> {
  const auth = await requireAdmin();
  if (!auth) return { logs: [], total: 0 };

  const { databases } = auth;
  const limit = 30;
  const offset = (page - 1) * limit;

  const queries = [
    Query.orderDesc("$createdAt"),
    Query.limit(limit),
    Query.offset(offset),
  ];

  if (actionFilter) {
    queries.push(Query.search("action", actionFilter));
  }

  const result = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.AUDIT_LOGS,
    queries,
  );

  return {
    logs: result.documents as unknown as AuditLogDoc[],
    total: result.total,
  };
}
