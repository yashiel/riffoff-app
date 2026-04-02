"use server";

import { ID, Query } from "node-appwrite";
import { revalidatePath } from "next/cache";
import { createAdminClient, createSessionClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS, BUCKETS } from "@/lib/appwrite/config";
import { serialize } from "@/lib/utils";
import type {
  DisputeDoc,
  DisputeStatus,
  OrderDoc,
  ProfileDoc,
  EventDoc,
} from "@/lib/appwrite/types";
import { createLogger } from "@/lib/logger";

const log = createLogger("disputes");

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

// ─── List Disputes ───────────────────────────────────

export async function listDisputes(
  status?: DisputeStatus,
  page = 1,
  limit = 20,
): Promise<{ disputes: DisputeDoc[]; total: number } | null> {
  const auth = await requireAdmin();
  if (!auth) return null;

  const { databases } = auth;
  const offset = (page - 1) * limit;

  const queries = [
    Query.orderDesc("openedAt"),
    Query.limit(limit),
    Query.offset(offset),
  ];

  if (status) {
    queries.push(Query.equal("status", status));
  }

  const result = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.DISPUTES,
    queries,
  );

  return {
    disputes: serialize(result.documents as unknown as DisputeDoc[]),
    total: result.total,
  };
}

// ─── Dispute Detail ──────────────────────────────────

export interface DisputeDetail {
  dispute: DisputeDoc;
  order: OrderDoc;
  customerName: string;
  customerEmail: string;
  eventTitle: string;
}

export async function getDisputeDetail(
  disputeId: string,
): Promise<DisputeDetail | null> {
  const auth = await requireAdmin();
  if (!auth) return null;

  const { databases } = auth;

  let dispute: DisputeDoc;
  try {
    dispute = (await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.DISPUTES,
      disputeId,
    )) as unknown as DisputeDoc;
  } catch {
    return null;
  }

  let order: OrderDoc;
  try {
    order = (await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.ORDERS,
      dispute.orderId,
    )) as unknown as OrderDoc;
  } catch {
    return null;
  }

  // Fetch customer info via admin Users API
  let customerName = "Unknown";
  let customerEmail = "unknown@example.com";
  try {
    const { users } = await createAdminClient();
    const appwriteUser = await users.get(order.userId);
    customerName = appwriteUser.name || "Unknown";
    customerEmail = appwriteUser.email || "unknown@example.com";
  } catch {
    // Fall back to profile
    try {
      const { documents } = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.PROFILES,
        [Query.equal("userId", order.userId), Query.limit(1)],
      );
      const profile = documents[0] as unknown as ProfileDoc | undefined;
      if (profile) {
        customerName = profile.displayName ?? "Unknown";
      }
    } catch {
      // Use defaults
    }
  }

  // Fetch event title
  let eventTitle = "Unknown event";
  try {
    const event = (await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.EVENTS,
      order.eventId,
    )) as unknown as EventDoc;
    eventTitle = event.title;
  } catch {
    // Use default
  }

  return serialize({
    dispute,
    order,
    customerName,
    customerEmail,
    eventTitle,
  });
}

// ─── Upload Evidence ─────────────────────────────────

export async function uploadDisputeEvidence(
  disputeId: string,
  formData: FormData,
): Promise<{ fileId: string; url: string } | null> {
  const auth = await requireAdmin();
  if (!auth) return null;

  const file = formData.get("file") as File | null;
  if (!file) return null;

  // Verify dispute exists and belongs to a valid case
  try {
    await auth.databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.DISPUTES,
      disputeId,
    );
  } catch {
    return null;
  }

  const { storage } = await createAdminClient();

  try {
    const uploaded = await storage.createFile(
      BUCKETS.DISPUTE_EVIDENCE,
      ID.unique(),
      file,
    );

    const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
    const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT!;
    const url = `${endpoint}/storage/buckets/${BUCKETS.DISPUTE_EVIDENCE}/files/${uploaded.$id}/view?project=${projectId}`;

    // Audit log
    await auth.databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.AUDIT_LOGS,
      ID.unique(),
      {
        actorId: auth.user.$id,
        action: "admin.dispute_evidence_uploaded",
        entityType: "dispute",
        entityId: disputeId,
        metadata: JSON.stringify({
          actorName: auth.profile.displayName ?? auth.user.name ?? "Admin",
          fileId: uploaded.$id,
          fileName: file.name,
          fileSize: file.size,
        }),
      },
    );

    return { fileId: uploaded.$id, url };
  } catch (err) {
    log.error("Failed to upload dispute evidence", err);
    return null;
  }
}

// ─── Submit Evidence ─────────────────────────────────

export async function submitDisputeEvidence(
  disputeId: string,
  evidenceText: string,
): Promise<boolean> {
  const auth = await requireAdmin();
  if (!auth) return false;

  const { databases } = auth;

  try {
    // Verify dispute is in a submittable state
    const dispute = (await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.DISPUTES,
      disputeId,
    )) as unknown as DisputeDoc;

    if (dispute.status !== "open" && dispute.status !== "needs_response") {
      return false;
    }

    // Update dispute status to submitted
    await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.DISPUTES,
      disputeId,
      { status: "submitted" },
    );

    // NOTE: In production, this would also call the provider API to submit evidence:
    // - Stripe: stripe.disputes.update(dispute.providerCaseId, { evidence: { ... } })
    // - PayPal: POST /v1/customer/disputes/{id}/provide-evidence
    // For now, we only update the local status.

    // Audit log
    await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.AUDIT_LOGS,
      ID.unique(),
      {
        actorId: auth.user.$id,
        action: "admin.dispute_evidence_submitted",
        entityType: "dispute",
        entityId: disputeId,
        metadata: JSON.stringify({
          actorName: auth.profile.displayName ?? auth.user.name ?? "Admin",
          provider: dispute.provider,
          providerCaseId: dispute.providerCaseId,
          evidenceTextLength: evidenceText.length,
        }),
      },
    );

    revalidatePath(`/dashboard/admin/disputes/${disputeId}`);
    revalidatePath("/dashboard/admin/disputes");
    return true;
  } catch (err) {
    log.error("Failed to submit dispute evidence", err);
    return false;
  }
}

// ─── Accept Loss ─────────────────────────────────────

export async function acceptDisputeLoss(
  disputeId: string,
): Promise<{ success: boolean; error?: string }> {
  const auth = await requireAdmin();
  if (!auth) return { success: false, error: "Admin access required" };

  const { databases } = auth;

  try {
    const dispute = (await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.DISPUTES,
      disputeId,
    )) as unknown as DisputeDoc;

    if (dispute.status === "won" || dispute.status === "lost") {
      return { success: false, error: "Dispute is already resolved" };
    }

    // Update dispute status to lost
    await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.DISPUTES,
      disputeId,
      { status: "lost" },
    );

    // Process refund on the linked order
    const { processRefund } = await import("@/actions/refunds");
    const refundResult = await processRefund(
      dispute.orderId,
      `Dispute loss accepted (Case: ${dispute.providerCaseId})`,
    );

    if (!refundResult.success) {
      log.error(`Refund failed for dispute ${disputeId}`, refundResult.error);
      // Still mark dispute as lost even if refund fails — the refund can be retried
    }

    // Audit log
    await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.AUDIT_LOGS,
      ID.unique(),
      {
        actorId: auth.user.$id,
        action: "admin.dispute_loss_accepted",
        entityType: "dispute",
        entityId: disputeId,
        metadata: JSON.stringify({
          actorName: auth.profile.displayName ?? auth.user.name ?? "Admin",
          orderId: dispute.orderId,
          amount: dispute.amount,
          provider: dispute.provider,
          providerCaseId: dispute.providerCaseId,
          refundSuccess: refundResult.success,
        }),
      },
    );

    revalidatePath(`/dashboard/admin/disputes/${disputeId}`);
    revalidatePath("/dashboard/admin/disputes");
    return { success: true };
  } catch (err) {
    log.error("Failed to accept dispute loss", err);
    return { success: false, error: "Failed to process dispute loss" };
  }
}
