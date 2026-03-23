"use server";

import { ID, Query } from "node-appwrite";
import { revalidatePath } from "next/cache";
import { createAdminClient, createSessionClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";
import type { RSVPDoc } from "@/lib/appwrite/types";

/** Toggle wishlist (interested) status for an event */
export async function toggleWishlist(
  eventId: string,
): Promise<{ wishlisted: boolean; error?: string }> {
  const sessionClient = await createSessionClient();
  if (!sessionClient) return { wishlisted: false, error: "Please log in" };

  const user = await sessionClient.account.get();
  const { databases } = await createAdminClient();

  try {
    // Check if RSVP already exists
    const existing = await databases.listDocuments(DATABASE_ID, COLLECTIONS.RSVPS, [
      Query.equal("eventId", eventId),
      Query.equal("userId", user.$id),
      Query.limit(1),
    ]);

    if (existing.documents.length > 0) {
      const rsvp = existing.documents[0] as unknown as RSVPDoc;

      if (rsvp.status === "interested") {
        // Remove wishlist
        await databases.deleteDocument(DATABASE_ID, COLLECTIONS.RSVPS, rsvp.$id);
        revalidatePath(`/events/${eventId}`);
        return { wishlisted: false };
      } else {
        // Already has a different RSVP status (going/notgoing) — don't change
        return { wishlisted: false, error: "You already have an RSVP for this event" };
      }
    }

    // Create new "interested" RSVP
    await databases.createDocument(DATABASE_ID, COLLECTIONS.RSVPS, ID.unique(), {
      eventId,
      userId: user.$id,
      status: "interested",
    });

    revalidatePath(`/events/${eventId}`);
    return { wishlisted: true };
  } catch {
    return { wishlisted: false, error: "Failed to update wishlist" };
  }
}

/** Check if current user has wishlisted specific events (batch) */
export async function getWishlistedEventIds(
  eventIds: string[],
): Promise<Set<string>> {
  const sessionClient = await createSessionClient();
  if (!sessionClient) return new Set();

  const user = await sessionClient.account.get();
  const { databases } = await createAdminClient();

  try {
    const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.RSVPS, [
      Query.equal("userId", user.$id),
      Query.equal("status", "interested"),
      Query.limit(100),
    ]);

    const wishlisted = new Set<string>();
    for (const doc of result.documents) {
      const rsvp = doc as unknown as RSVPDoc;
      if (eventIds.includes(rsvp.eventId)) {
        wishlisted.add(rsvp.eventId);
      }
    }
    return wishlisted;
  } catch {
    return new Set();
  }
}
