"use server";

import { ID, Query } from "node-appwrite";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createAdminClient, createSessionClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";
import { checkExportRateLimit } from "@/lib/security/rate-limit";
import { createAuditLog } from "@/lib/audit";
import type { ConsentType, UserConsentDoc } from "@/lib/appwrite/types";

/** Get all consent records for the current user */
export async function getMyConsents(): Promise<UserConsentDoc[]> {
  const sessionClient = await createSessionClient();
  if (!sessionClient) return [];

  const user = await sessionClient.account.get();
  const { databases } = await createAdminClient();

  try {
    const result = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.USER_CONSENTS,
      [Query.equal("userId", user.$id), Query.limit(10)],
    );
    return result.documents as unknown as UserConsentDoc[];
  } catch {
    return [];
  }
}

/** Update or create a consent record */
export async function updateConsent(
  consentType: ConsentType,
  granted: boolean,
): Promise<{ error?: string; success?: boolean }> {
  const sessionClient = await createSessionClient();
  if (!sessionClient) return { error: "Please log in" };

  const user = await sessionClient.account.get();
  const { databases } = await createAdminClient();

  const headerStore = await headers();
  const ip = headerStore.get("x-forwarded-for") ?? headerStore.get("x-real-ip") ?? null;
  const ua = headerStore.get("user-agent") ?? null;

  try {
    // Check for existing consent record
    const existing = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.USER_CONSENTS,
      [
        Query.equal("userId", user.$id),
        Query.equal("consentType", consentType),
        Query.limit(1),
      ],
    );

    const now = new Date().toISOString();

    if (existing.documents.length > 0) {
      // Update existing
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.USER_CONSENTS,
        existing.documents[0].$id,
        {
          granted,
          ...(granted ? { grantedAt: now, revokedAt: null } : { revokedAt: now }),
          ipAddress: ip,
          userAgent: ua?.slice(0, 500) ?? null,
        },
      );
    } else {
      // Create new
      await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.USER_CONSENTS,
        ID.unique(),
        {
          userId: user.$id,
          consentType,
          granted,
          grantedAt: now,
          revokedAt: granted ? null : now,
          ipAddress: ip,
          userAgent: ua?.slice(0, 500) ?? null,
        },
      );
    }

    await createAuditLog({
      actorId: user.$id,
      action: "profile.consent_updated",
      entityType: "consent",
      entityId: consentType,
      metadata: { consentType, granted },
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch {
    return { error: "Failed to update consent" };
  }
}

/** Export all user data as a JSON object (GDPR Article 20) */
export async function exportMyData(): Promise<{ data?: string; error?: string }> {
  const sessionClient = await createSessionClient();
  if (!sessionClient) return { error: "Please log in" };

  const user = await sessionClient.account.get();

  const rateCheck = checkExportRateLimit(user.$id);
  if (!rateCheck.allowed) return { error: "You can only export data once per hour" };

  const { databases } = await createAdminClient();

  try {
    // Collect all user data across collections
    const [profile, orders, tickets, rsvps, notifications, consents] = await Promise.all([
      databases.listDocuments(DATABASE_ID, COLLECTIONS.PROFILES, [
        Query.equal("userId", user.$id), Query.limit(1),
      ]),
      databases.listDocuments(DATABASE_ID, COLLECTIONS.ORDERS, [
        Query.equal("buyerId", user.$id), Query.limit(100),
      ]).catch(() => ({ documents: [] })),
      databases.listDocuments(DATABASE_ID, COLLECTIONS.TICKETS, [
        Query.equal("ownerId", user.$id), Query.limit(500),
      ]).catch(() => ({ documents: [] })),
      databases.listDocuments(DATABASE_ID, COLLECTIONS.RSVPS, [
        Query.equal("userId", user.$id), Query.limit(100),
      ]).catch(() => ({ documents: [] })),
      databases.listDocuments(DATABASE_ID, COLLECTIONS.NOTIFICATIONS, [
        Query.equal("userId", user.$id), Query.limit(200),
      ]).catch(() => ({ documents: [] })),
      databases.listDocuments(DATABASE_ID, COLLECTIONS.USER_CONSENTS, [
        Query.equal("userId", user.$id), Query.limit(10),
      ]).catch(() => ({ documents: [] })),
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      account: {
        id: user.$id,
        email: user.email,
        name: user.name,
        registeredAt: user.registration,
      },
      profile: profile.documents[0] ?? null,
      orders: orders.documents,
      tickets: tickets.documents,
      rsvps: rsvps.documents,
      notifications: notifications.documents,
      consents: consents.documents,
    };

    await createAuditLog({
      actorId: user.$id,
      action: "profile.data_exported",
      entityType: "user",
      entityId: user.$id,
    });

    return { data: JSON.stringify(exportData, null, 2) };
  } catch {
    return { error: "Failed to export data" };
  }
}
