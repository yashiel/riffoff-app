"use server";

import { Query } from "node-appwrite";
import { createAdminClient, createSessionClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";
import type { ProfileDoc } from "@/lib/appwrite/types";

/**
 * Check if the current user has admin role.
 * Used to bypass ownership checks — admins can modify any resource.
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const sessionClient = await createSessionClient();
  if (!sessionClient) return false;

  try {
    const user = await sessionClient.account.get();
    const { databases } = await createAdminClient();

    const { documents } = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PROFILES,
      [Query.equal("userId", user.$id), Query.limit(1)],
    );

    const profile = documents[0] as unknown as ProfileDoc | undefined;
    return profile?.role === "admin";
  } catch {
    return false;
  }
}

/**
 * Check if a user owns the resource OR is an admin.
 * Replaces `if (event.organiserId !== user.$id)` checks.
 */
export function isOwnerOrAdmin(
  resourceOwnerId: string,
  currentUserId: string,
  userRole: string,
): boolean {
  return resourceOwnerId === currentUserId || userRole === "admin";
}
