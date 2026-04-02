"use server";

import { Query } from "node-appwrite";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient, createSessionClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS, SESSION_COOKIE_NAME } from "@/lib/appwrite/config";
import { checkSensitiveRateLimit } from "@/lib/security/rate-limit";
import { createAuditLog } from "@/lib/audit";
import type { ProfileDoc } from "@/lib/appwrite/types";

/** Deactivate account — hides profile, logs out all sessions */
export async function deactivateAccount(): Promise<{ error?: string }> {
  const sessionClient = await createSessionClient();
  if (!sessionClient) return { error: "Please log in" };

  const user = await sessionClient.account.get();

  const rateCheck = await checkSensitiveRateLimit(user.$id);
  if (!rateCheck.allowed) return { error: "Too many attempts. Try again later." };

  const { databases } = await createAdminClient();

  const { documents } = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.PROFILES,
    [Query.equal("userId", user.$id), Query.limit(1)],
  );
  if (documents.length === 0) return { error: "Profile not found" };
  const profile = documents[0] as unknown as ProfileDoc;

  if (profile.deactivatedAt) return { error: "Account is already deactivated" };

  try {
    await databases.updateDocument(DATABASE_ID, COLLECTIONS.PROFILES, profile.$id, {
      deactivatedAt: new Date().toISOString(),
    });

    await createAuditLog({
      actorId: user.$id,
      action: "profile.deactivated",
      entityType: "profile",
      entityId: profile.$id,
    });

    // Log out all sessions
    try {
      await sessionClient.account.deleteSessions();
    } catch {
      // Some sessions may already be expired
    }

    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
  } catch {
    return { error: "Failed to deactivate account" };
  }

  redirect("/login");
}

/** Reactivate a deactivated account (called during login flow) */
export async function reactivateAccount(userId: string): Promise<void> {
  const { databases } = await createAdminClient();

  const { documents } = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.PROFILES,
    [Query.equal("userId", userId), Query.limit(1)],
  );

  if (documents.length === 0) return;
  const profile = documents[0] as unknown as ProfileDoc;
  if (!profile.deactivatedAt) return;

  await databases.updateDocument(DATABASE_ID, COLLECTIONS.PROFILES, profile.$id, {
    deactivatedAt: null,
  });

  await createAuditLog({
    actorId: userId,
    action: "profile.reactivated",
    entityType: "profile",
    entityId: profile.$id,
  });
}
