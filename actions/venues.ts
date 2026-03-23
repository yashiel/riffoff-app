"use server";

import { ID } from "node-appwrite";
import { createAdminClient, createSessionClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";
import { sanitizeText } from "@/lib/security/sanitize";

/**
 * Create a new venue (called when organiser types a venue name not in the list).
 * Returns the new venue's ID.
 */
export async function createVenue(
  name: string,
  address?: string,
): Promise<{ venueId?: string; error?: string }> {
  const sessionClient = await createSessionClient();
  if (!sessionClient) return { error: "Please log in" };

  const sanitizedName = sanitizeText(name).slice(0, 200);
  if (!sanitizedName || sanitizedName.length < 2) {
    return { error: "Venue name must be at least 2 characters" };
  }

  const { databases } = await createAdminClient();

  try {
    const doc = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.VENUES,
      ID.unique(),
      {
        name: sanitizedName,
        address: address ? sanitizeText(address).slice(0, 500) : null,
        geo: null,
      },
    );

    return { venueId: doc.$id };
  } catch {
    return { error: "Failed to create venue" };
  }
}
