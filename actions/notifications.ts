"use server";

import { ID, Query } from "node-appwrite";
import { revalidatePath } from "next/cache";
import { createAdminClient, createSessionClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";
import { serialize } from "@/lib/utils";
import type { NotificationDoc, NotificationType } from "@/lib/appwrite/types";

// ─── Create Notification (internal helper) ───────────

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  linkUrl?: string;
  metadata?: Record<string, unknown>;
}

/** Create a notification for a user (server-side only) */
export async function createNotification(
  input: CreateNotificationInput,
): Promise<void> {
  const { databases } = await createAdminClient();

  try {
    await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.NOTIFICATIONS,
      ID.unique(),
      {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        linkUrl: input.linkUrl ?? null,
        readAt: null,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      },
    );
  } catch {
    // Notification creation should never block the main action
    console.error(`Failed to create notification for ${input.userId}`);
  }
}

// ─── Read Notifications ──────────────────────────────

/** Get notifications for the current user */
export async function getMyNotifications(
  limit = 20,
  unreadOnly = false,
): Promise<NotificationDoc[]> {
  const sessionClient = await createSessionClient();
  if (!sessionClient) return [];

  const user = await sessionClient.account.get();
  const { databases } = await createAdminClient();

  const queries = [
    Query.equal("userId", user.$id),
    Query.orderDesc("$createdAt"),
    Query.limit(limit),
  ];

  if (unreadOnly) {
    queries.push(Query.isNull("readAt"));
  }

  const result = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.NOTIFICATIONS,
    queries,
  );

  return serialize(result.documents as unknown as NotificationDoc[]);
}

/** Get unread notification count */
export async function getUnreadCount(): Promise<number> {
  const sessionClient = await createSessionClient();
  if (!sessionClient) return 0;

  const user = await sessionClient.account.get();
  const { databases } = await createAdminClient();

  const result = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.NOTIFICATIONS,
    [
      Query.equal("userId", user.$id),
      Query.isNull("readAt"),
      Query.limit(1),
    ],
  );

  return result.total;
}

// ─── Mark as Read ────────────────────────────────────

/** Mark a single notification as read */
export async function markAsRead(
  notificationId: string,
): Promise<{ error?: string }> {
  const sessionClient = await createSessionClient();
  if (!sessionClient) return { error: "Please log in" };

  const user = await sessionClient.account.get();
  const { databases } = await createAdminClient();

  const notification = (await databases.getDocument(
    DATABASE_ID,
    COLLECTIONS.NOTIFICATIONS,
    notificationId,
  )) as unknown as NotificationDoc;

  if (notification.userId !== user.$id) return { error: "Not authorized" };
  if (notification.readAt) return {}; // Already read

  try {
    await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.NOTIFICATIONS,
      notificationId,
      { readAt: new Date().toISOString() },
    );
    revalidatePath("/dashboard");
    return {};
  } catch {
    return { error: "Failed to mark as read" };
  }
}

/** Mark all notifications as read */
export async function markAllAsRead(): Promise<{ error?: string }> {
  const sessionClient = await createSessionClient();
  if (!sessionClient) return { error: "Please log in" };

  const user = await sessionClient.account.get();
  const { databases } = await createAdminClient();

  const unread = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.NOTIFICATIONS,
    [
      Query.equal("userId", user.$id),
      Query.isNull("readAt"),
      Query.limit(100),
    ],
  );

  const now = new Date().toISOString();

  try {
    await Promise.all(
      unread.documents.map((doc) =>
        databases.updateDocument(
          DATABASE_ID,
          COLLECTIONS.NOTIFICATIONS,
          doc.$id,
          { readAt: now },
        ),
      ),
    );
    revalidatePath("/dashboard");
    return {};
  } catch {
    return { error: "Failed to mark all as read" };
  }
}

// ─── Notification Helpers (typed creators) ───────────

/** Notify organiser when an artist applies to their event */
export async function notifyApplicationSubmitted(
  organiserId: string,
  artistName: string,
  eventTitle: string,
  eventId: string,
): Promise<void> {
  await createNotification({
    userId: organiserId,
    type: "application_submitted",
    title: "New artist application",
    body: `${artistName} applied to perform at "${eventTitle}"`,
    linkUrl: `/dashboard/events/${eventId}/applications`,
    metadata: { artistName, eventTitle, eventId },
  });
}

/** Notify artist when their application status changes */
export async function notifyApplicationStatusChanged(
  artistId: string,
  eventTitle: string,
  eventId: string,
  newStatus: "accepted" | "rejected" | "shortlisted",
): Promise<void> {
  const statusLabels = {
    accepted: { title: "Application accepted!", body: `You've been accepted to perform at "${eventTitle}"` },
    rejected: { title: "Application update", body: `Your application for "${eventTitle}" was not selected` },
    shortlisted: { title: "You've been shortlisted!", body: `You're shortlisted for "${eventTitle}"` },
  };

  const { title, body } = statusLabels[newStatus];

  await createNotification({
    userId: artistId,
    type: `application_${newStatus}` as NotificationType,
    title,
    body,
    linkUrl: `/dashboard/applications`,
    metadata: { eventTitle, eventId, status: newStatus },
  });
}

/** Notify buyer when ticket is purchased */
export async function notifyTicketPurchased(
  userId: string,
  eventTitle: string,
  ticketCode: string,
  ticketId: string,
): Promise<void> {
  await createNotification({
    userId,
    type: "ticket_purchased",
    title: "Ticket confirmed!",
    body: `Your ticket for "${eventTitle}" is ready. Code: ${ticketCode}`,
    linkUrl: `/dashboard/tickets/${ticketId}`,
    metadata: { eventTitle, ticketCode, ticketId },
  });
}

/** Notify followers when an event is published */
export async function notifyEventPublished(
  userId: string,
  eventTitle: string,
  eventId: string,
): Promise<void> {
  await createNotification({
    userId,
    type: "event_published",
    title: "New event!",
    body: `"${eventTitle}" is now live. Get your tickets!`,
    linkUrl: `/events/${eventId}`,
    metadata: { eventTitle, eventId },
  });
}

/** Notify ticket holders when an event is cancelled */
export async function notifyEventCancelled(
  userId: string,
  eventTitle: string,
  eventId: string,
): Promise<void> {
  await createNotification({
    userId,
    type: "event_cancelled",
    title: "Event cancelled",
    body: `"${eventTitle}" has been cancelled. Check your tickets for refund status.`,
    linkUrl: `/dashboard/tickets`,
    metadata: { eventTitle, eventId },
  });
}
