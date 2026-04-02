"use server";

import { ID, Query } from "node-appwrite";
import { revalidatePath } from "next/cache";
import { createAdminClient, createSessionClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";
import { checkSensitiveRateLimit } from "@/lib/security/rate-limit";
import { createAuditLog } from "@/lib/audit";
import { createNotification } from "@/actions/notifications";
import type { DeletionRequestDoc } from "@/lib/appwrite/types";

const GRACE_PERIOD_DAYS = 30;

/** Get active deletion request for the current user */
export async function getDeletionRequest(): Promise<DeletionRequestDoc | null> {
  const sessionClient = await createSessionClient();
  if (!sessionClient) return null;

  const user = await sessionClient.account.get();
  const { databases } = await createAdminClient();

  try {
    const result = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.DELETION_REQUESTS,
      [
        Query.equal("userId", user.$id),
        Query.equal("status", "pending"),
        Query.limit(1),
      ],
    );

    return (result.documents[0] as unknown as DeletionRequestDoc) ?? null;
  } catch {
    return null;
  }
}

/** Request account deletion with 30-day grace period */
export async function requestAccountDeletion(
  reason?: string,
): Promise<{ error?: string; success?: boolean }> {
  const sessionClient = await createSessionClient();
  if (!sessionClient) return { error: "Please log in" };

  const user = await sessionClient.account.get();

  const rateCheck = await checkSensitiveRateLimit(user.$id);
  if (!rateCheck.allowed) return { error: "Too many attempts. Try again later." };

  const { databases } = await createAdminClient();

  // Check for existing pending request
  const existing = await getDeletionRequest();
  if (existing) {
    return { error: "You already have a pending deletion request" };
  }

  const now = new Date();
  const scheduledDeleteAt = new Date(now);
  scheduledDeleteAt.setDate(scheduledDeleteAt.getDate() + GRACE_PERIOD_DAYS);

  try {
    const doc = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.DELETION_REQUESTS,
      ID.unique(),
      {
        userId: user.$id,
        reason: reason?.slice(0, 500) ?? null,
        status: "pending",
        requestedAt: now.toISOString(),
        scheduledDeleteAt: scheduledDeleteAt.toISOString(),
        completedAt: null,
        cancelledAt: null,
      },
    );

    await createAuditLog({
      actorId: user.$id,
      action: "profile.deletion_requested",
      entityType: "deletion_request",
      entityId: doc.$id,
      metadata: { scheduledDeleteAt: scheduledDeleteAt.toISOString() },
    });

    await createNotification({
      userId: user.$id,
      type: "system",
      title: "Account deletion scheduled",
      body: `Your account will be permanently deleted on ${scheduledDeleteAt.toLocaleDateString()}. You can cancel this from Settings.`,
      linkUrl: "/dashboard/settings?tab=danger",
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch {
    return { error: "Failed to request deletion" };
  }
}

/** Cancel a pending deletion request */
export async function cancelAccountDeletion(): Promise<{ error?: string; success?: boolean }> {
  const sessionClient = await createSessionClient();
  if (!sessionClient) return { error: "Please log in" };

  const user = await sessionClient.account.get();
  const { databases } = await createAdminClient();

  const request = await getDeletionRequest();
  if (!request) return { error: "No pending deletion request found" };

  try {
    await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.DELETION_REQUESTS,
      request.$id,
      {
        status: "cancelled",
        cancelledAt: new Date().toISOString(),
      },
    );

    await createAuditLog({
      actorId: user.$id,
      action: "profile.deletion_cancelled",
      entityType: "deletion_request",
      entityId: request.$id,
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch {
    return { error: "Failed to cancel deletion" };
  }
}
