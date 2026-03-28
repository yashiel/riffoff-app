"use server";

import { ID, Query } from "node-appwrite";
import { z } from "zod/v4";
import { createAdminClient, createSessionClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";
import { createNotification } from "@/actions/notifications";
import { serialize } from "@/lib/utils";
import type {
  EventDoc,
  EventRatingDoc,
  ProfileDoc,
} from "@/lib/appwrite/types";

// ─── Validation ─────────────────────────────────────

const submitRatingSchema = z.object({
  eventId: z.string().min(1, "Event ID is required"),
  rating: z.int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

// ─── Submit Event Rating ────────────────────────────

export async function submitEventRating(
  eventId: string,
  rating: number,
  comment?: string,
): Promise<{ success: true } | { error: string }> {
  const parsed = submitRatingSchema.safeParse({ eventId, rating, comment });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const sessionClient = await createSessionClient();
  if (!sessionClient) return { error: "Please log in" };

  const user = await sessionClient.account.get();
  const { databases } = await createAdminClient();

  // Verify event exists and is completed
  let event: EventDoc;
  try {
    event = await databases.getDocument<EventDoc>(
      DATABASE_ID,
      COLLECTIONS.EVENTS,
      eventId,
    );
  } catch {
    return { error: "Event not found" };
  }

  if (event.status !== "completed") {
    return { error: "Ratings can only be submitted for completed events" };
  }

  // Verify user has at least one ticket for this event
  const ticketCheck = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.TICKETS,
    [
      Query.equal("eventId", eventId),
      Query.equal("ownerId", user.$id),
      Query.limit(1),
    ],
  );

  if (ticketCheck.total === 0) {
    return { error: "You must have a ticket for this event to rate it" };
  }

  // Check for existing rating (one per user per event)
  const existingRating = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.EVENT_RATINGS,
    [
      Query.equal("userId", user.$id),
      Query.equal("eventId", eventId),
      Query.limit(1),
    ],
  );

  if (existingRating.total > 0) {
    return { error: "You have already rated this event" };
  }

  // Create the rating document
  await databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.EVENT_RATINGS,
    ID.unique(),
    {
      eventId,
      userId: user.$id,
      rating: parsed.data.rating,
      comment: parsed.data.comment ?? null,
      organiserId: event.organiserId,
    },
  );

  // Notify the organiser
  try {
    await createNotification({
      userId: event.organiserId,
      type: "rating_received",
      title: "New event rating",
      body: `Someone rated "${event.title}" ${parsed.data.rating}/5`,
      linkUrl: `/dashboard/events/${eventId}`,
    });
  } catch {
    // Non-critical: don't fail the rating if notification fails
  }

  return { success: true };
}

// ─── Get Event Ratings (paginated) ──────────────────

export async function getEventRatings(
  eventId: string,
  page = 1,
  limit = 20,
): Promise<{
  ratings: Array<EventRatingDoc & { userName: string }>;
  total: number;
}> {
  const { databases } = await createAdminClient();

  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const offset = (Math.max(page, 1) - 1) * safeLimit;

  const result = await databases.listDocuments<EventRatingDoc>(
    DATABASE_ID,
    COLLECTIONS.EVENT_RATINGS,
    [
      Query.equal("eventId", eventId),
      Query.orderDesc("$createdAt"),
      Query.limit(safeLimit),
      Query.offset(offset),
    ],
  );

  // Fetch display names for each rating's user
  const userIds = [...new Set(result.documents.map((r) => r.userId))];

  const profileMap = new Map<string, string>();

  if (userIds.length > 0) {
    const profiles = await databases.listDocuments<ProfileDoc>(
      DATABASE_ID,
      COLLECTIONS.PROFILES,
      [Query.equal("userId", userIds), Query.limit(userIds.length)],
    );

    for (const profile of profiles.documents) {
      profileMap.set(profile.userId, profile.displayName ?? "Anonymous");
    }
  }

  const ratings = result.documents.map((doc) => ({
    ...serialize(doc),
    userName: profileMap.get(doc.userId) ?? "Anonymous",
  }));

  return { ratings, total: result.total };
}

// ─── Get Event Ratings Summary ──────────────────────

// TODO: For production scale (billion-user), denormalize averageRating and
// totalRatings directly onto EventDoc. Update them atomically on each new
// rating via an Appwrite Function trigger or post-write hook. The current
// approach queries all ratings on every event detail page load, which is
// acceptable with an eventId index but won't scale past ~50k ratings/event.

export async function getEventRatingsSummary(
  eventId: string,
): Promise<{ averageRating: number; totalRatings: number }> {
  const { databases } = await createAdminClient();

  const result = await databases.listDocuments<EventRatingDoc>(
    DATABASE_ID,
    COLLECTIONS.EVENT_RATINGS,
    [
      Query.equal("eventId", eventId),
      Query.select(["rating"]),
      Query.limit(5000),
    ],
  );

  const totalRatings = result.total;

  if (totalRatings === 0) {
    return { averageRating: 0, totalRatings: 0 };
  }

  const sum = result.documents.reduce((acc, doc) => acc + doc.rating, 0);
  const averageRating = Math.round((sum / result.documents.length) * 10) / 10;

  return { averageRating, totalRatings };
}

// ─── Get Organiser Ratings Summary ──────────────────

export async function getOrganiserRatingsSummary(
  organiserId: string,
): Promise<{ averageRating: number; totalRatings: number }> {
  const { databases } = await createAdminClient();

  const result = await databases.listDocuments<EventRatingDoc>(
    DATABASE_ID,
    COLLECTIONS.EVENT_RATINGS,
    [
      Query.equal("organiserId", organiserId),
      Query.select(["rating"]),
      Query.limit(5000),
    ],
  );

  const totalRatings = result.total;

  if (totalRatings === 0) {
    return { averageRating: 0, totalRatings: 0 };
  }

  const sum = result.documents.reduce((acc, doc) => acc + doc.rating, 0);
  const averageRating = Math.round((sum / result.documents.length) * 10) / 10;

  return { averageRating, totalRatings };
}
