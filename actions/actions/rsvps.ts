"use server";

import { ID, Query } from "node-appwrite";
import { revalidatePath } from "next/cache";
import { z } from "zod/v4";
import { createAdminClient, createSessionClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";
import { serialize } from "@/lib/utils";
import type { RSVPDoc, RSVPStatus } from "@/lib/appwrite/types";

const rsvpSchema = z.object({
  eventId: z.string().min(1),
  status: z.enum(["interested", "going", "notgoing"]),
});

export type RSVPResult = {
  error?: string;
  rsvp?: RSVPDoc;
};

/** Create or update an RSVP for the current user */
export async function createOrUpdateRSVP(
  eventId: string,
  status: RSVPStatus,
): Promise<RSVPResult> {
  const parsed = rsvpSchema.safeParse({ eventId, status });
  if (!parsed.success) {
    return { error: "Invalid input" };
  }

  const sessionClient = await createSessionClient();
  if (!sessionClient) {
    return { error: "Please log in to RSVP" };
  }

  try {
    const user = await sessionClient.account.get();
    const { databases } = await createAdminClient();

    // Check for existing RSVP
    const existing = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.RSVPS,
      [
        Query.equal("eventId", eventId),
        Query.equal("userId", user.$id),
        Query.limit(1),
      ],
    );

    let rsvp: RSVPDoc;

    if (existing.documents.length > 0) {
      // Update existing RSVP
      rsvp = (await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.RSVPS,
        existing.documents[0].$id,
        { status },
      )) as unknown as RSVPDoc;
    } else {
      // Create new RSVP
      rsvp = (await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.RSVPS,
        ID.unique(),
        {
          eventId,
          userId: user.$id,
          status,
        },
      )) as unknown as RSVPDoc;
    }

    revalidatePath(`/events/${eventId}`);
    return { rsvp: serialize(rsvp) };
  } catch {
    return { error: "Failed to update RSVP. Please try again." };
  }
}

/** Get the current user's RSVP for a specific event */
export async function getUserRSVP(
  eventId: string,
): Promise<RSVPDoc | null> {
  const sessionClient = await createSessionClient();
  if (!sessionClient) return null;

  try {
    const user = await sessionClient.account.get();
    const { databases } = await createAdminClient();

    const result = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.RSVPS,
      [
        Query.equal("eventId", eventId),
        Query.equal("userId", user.$id),
        Query.limit(1),
      ],
    );

    const doc = result.documents[0] as unknown as RSVPDoc | undefined;
    return doc ? serialize(doc) : null;
  } catch {
    return null;
  }
}
