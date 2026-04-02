"use server";

import { ID, Query } from "node-appwrite";
import { revalidatePath } from "next/cache";
import { createAdminClient, createSessionClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";
import { getStripe } from "@/lib/payments/stripe/client";
import {
  getPayPalAccessToken,
  getPayPalApiUrl,
} from "@/lib/payments/paypal/client";
import { createNotification } from "@/actions/notifications";
import type {
  OrderDoc,
  TicketDoc,
  ProfileDoc,
  EventDoc,
} from "@/lib/appwrite/types";
import { createLogger } from "@/lib/logger";

const log = createLogger("refunds");

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

// ─── Process Refund ──────────────────────────────────

export async function processRefund(
  orderId: string,
  reason?: string,
): Promise<{ success: boolean; error?: string }> {
  const auth = await requireAdmin();
  if (!auth) return { success: false, error: "Admin access required" };

  const { databases } = auth;

  // 1. Get order
  let order: OrderDoc;
  try {
    order = (await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.ORDERS,
      orderId,
    )) as unknown as OrderDoc;
  } catch {
    return { success: false, error: "Order not found" };
  }

  // 2. Verify order is in a refundable state
  if (order.status !== "paid" && order.status !== "disputed") {
    return {
      success: false,
      error: `Cannot refund order with status "${order.status}". Only paid or disputed orders can be refunded.`,
    };
  }

  // 3. Process refund with the payment provider
  try {
    switch (order.provider) {
      case "stripe": {
        const stripe = getStripe();
        await stripe.refunds.create({
          payment_intent: order.providerRef,
          reason: "requested_by_customer",
        });
        break;
      }

      case "paypal": {
        const accessToken = await getPayPalAccessToken();
        const apiUrl = getPayPalApiUrl();

        const response = await fetch(
          `${apiUrl}/v2/payments/captures/${order.providerRef}/refund`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              note_to_payer: reason ?? "Refund processed by admin",
            }),
          },
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          const message =
            errorData?.message ?? `PayPal refund failed: ${response.status}`;
          return { success: false, error: message };
        }
        break;
      }

      case "tng": {
        // TNG refunds must be processed manually through the TNG partner dashboard.
        // Log a warning so the admin knows to complete this step outside the system.
        log.warn(
          `TNG refund for order ${orderId} must be processed manually via TNG partner dashboard`,
          { providerRef: order.providerRef, amount: order.amount, currency: order.currency },
        );
        break;
      }
    }
  } catch (err) {
    log.error(`Provider refund failed for order ${orderId}`, err);
    return {
      success: false,
      error: `Payment provider refund failed: ${err instanceof Error ? err.message : "Unknown error"}`,
    };
  }

  // 4. Update order status to refunded
  try {
    await databases.updateDocument(DATABASE_ID, COLLECTIONS.ORDERS, orderId, {
      status: "refunded",
    });
  } catch (err) {
    log.error(`Failed to update order status for ${orderId}`, err);
    // Provider refund succeeded but DB update failed — log for manual reconciliation
    return {
      success: false,
      error:
        "Refund was processed with payment provider but failed to update order status. Manual reconciliation needed.",
    };
  }

  // 5. Void all tickets for this order
  try {
    const ticketsResult = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.TICKETS,
      [Query.equal("orderId", orderId), Query.limit(100)],
    );

    const tickets = ticketsResult.documents as unknown as TicketDoc[];

    await Promise.all(
      tickets
        .filter((t) => t.status === "active")
        .map((ticket) =>
          databases.updateDocument(
            DATABASE_ID,
            COLLECTIONS.TICKETS,
            ticket.$id,
            { status: "refunded" },
          ),
        ),
    );
  } catch (err) {
    log.error(`Failed to void tickets for order ${orderId}`, err);
    // Continue — order is already refunded, tickets can be voided manually
  }

  // 6. Audit log
  try {
    await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.AUDIT_LOGS,
      ID.unique(),
      {
        actorId: auth.user.$id,
        action: "admin.refund",
        entityType: "order",
        entityId: orderId,
        metadata: JSON.stringify({
          actorName: auth.profile.displayName ?? auth.user.name ?? "Admin",
          provider: order.provider,
          amount: order.amount,
          currency: order.currency,
          reason: reason ?? "Admin-initiated refund",
          providerRef: order.providerRef,
        }),
      },
    );
  } catch {
    // Audit log failure should not block the refund flow
    log.error(`Failed to create audit log for refund on order ${orderId}`);
  }

  // 7. Notify the customer
  try {
    let eventTitle = "your event";
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

    await createNotification({
      userId: order.userId,
      type: "system",
      title: "Refund processed",
      body: `Your order for "${eventTitle}" has been refunded. The amount will be returned to your original payment method.`,
      linkUrl: "/dashboard/orders",
    });
  } catch {
    // Notification failure should not block the refund flow
    log.error(`Failed to notify user ${order.userId} about refund for order ${orderId}`);
  }

  revalidatePath("/dashboard/admin/disputes");
  return { success: true };
}
