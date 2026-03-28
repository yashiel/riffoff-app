import { NextRequest, NextResponse } from "next/server";
import { ID, Query } from "node-appwrite";
import { getPayPalAccessToken, getPayPalApiUrl } from "@/lib/payments/paypal/client";
import { issueTicketsForOrder } from "@/lib/tickets/issue";
import { createAdminClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";
import type { DisputeDoc, OrderDoc } from "@/lib/appwrite/types";

/**
 * Verify PayPal webhook signature by calling PayPal's verification API.
 * See: https://developer.paypal.com/docs/api/webhooks/v1/#verify-webhook-signature_post
 */
async function verifyPayPalWebhook(
  request: NextRequest,
  body: string,
): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    console.error("PAYPAL_WEBHOOK_ID not configured");
    return false;
  }

  const accessToken = await getPayPalAccessToken();
  const apiUrl = getPayPalApiUrl();

  const verificationBody = {
    auth_algo: request.headers.get("paypal-auth-algo") ?? "",
    cert_url: request.headers.get("paypal-cert-url") ?? "",
    transmission_id: request.headers.get("paypal-transmission-id") ?? "",
    transmission_sig: request.headers.get("paypal-transmission-sig") ?? "",
    transmission_time: request.headers.get("paypal-transmission-time") ?? "",
    webhook_id: webhookId,
    webhook_event: JSON.parse(body),
  };

  const response = await fetch(
    `${apiUrl}/v1/notifications/verify-webhook-signature`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(verificationBody),
    },
  );

  if (!response.ok) {
    return false;
  }

  const result = await response.json();
  return result.verification_status === "SUCCESS";
}

export async function POST(request: NextRequest) {
  const body = await request.text();

  // Verify webhook signature
  const isValid = await verifyPayPalWebhook(request, body);
  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(body);

  switch (event.event_type) {
    case "CHECKOUT.ORDER.APPROVED": {
      // Order approved by buyer — capture happens client-side via capture-order endpoint
      break;
    }

    case "PAYMENT.CAPTURE.COMPLETED": {
      // Payment successfully captured
      const capture = event.resource;
      const orderId = capture?.supplementary_data?.related_ids?.order_id;

      if (orderId) {
        await issueTicketsForOrder(orderId, capture.id ?? "");
      }
      break;
    }

    case "PAYMENT.CAPTURE.DENIED":
    case "PAYMENT.CAPTURE.REVERSED": {
      // Payment denied or reversed — log for investigation
      console.error(
        `PayPal payment ${event.event_type}:`,
        event.resource?.id,
      );
      break;
    }

    case "CUSTOMER.DISPUTE.CREATED": {
      const dispute = event.resource;
      const { databases } = await createAdminClient();

      // Extract the seller transaction ID from disputed transactions
      const sellerTxnId =
        dispute?.disputed_transactions?.[0]?.seller_transaction_id ?? "";

      // Find order by providerRef
      let order: OrderDoc | undefined;
      if (sellerTxnId) {
        const ordersResult = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.ORDERS,
          [Query.equal("providerRef", sellerTxnId), Query.limit(1)],
        );
        order = ordersResult.documents[0] as unknown as OrderDoc | undefined;
      }

      if (!order) {
        console.error(
          "PayPal dispute webhook: no order found for transaction",
          sellerTxnId,
        );
        break;
      }

      const disputeAmount = dispute?.dispute_amount?.value
        ? Math.round(parseFloat(dispute.dispute_amount.value) * 100)
        : order.amount;

      await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.DISPUTES,
        ID.unique(),
        {
          provider: "paypal",
          orderId: order.$id,
          providerCaseId: dispute.dispute_id ?? "",
          status: "needs_response",
          deadlineAt: dispute?.seller_response_due_date ?? null,
          reason: dispute?.reason ?? null,
          amount: disputeAmount,
          openedAt: new Date().toISOString(),
        },
      );

      // Update order status to disputed
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.ORDERS,
        order.$id,
        { status: "disputed" },
      );

      break;
    }

    case "CUSTOMER.DISPUTE.UPDATED": {
      const dispute = event.resource;
      const { databases } = await createAdminClient();

      if (!dispute?.dispute_id) break;

      const disputesResult = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.DISPUTES,
        [Query.equal("providerCaseId", dispute.dispute_id), Query.limit(1)],
      );

      const existingDispute = disputesResult.documents[0] as unknown as
        | DisputeDoc
        | undefined;
      if (!existingDispute) break;

      // Map PayPal dispute status
      let newStatus: string = existingDispute.status;
      if (dispute.status === "WAITING_FOR_SELLER_RESPONSE") {
        newStatus = "needs_response";
      } else if (dispute.status === "UNDER_REVIEW") {
        newStatus = "submitted";
      } else if (dispute.status === "OPEN") {
        newStatus = "open";
      }

      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.DISPUTES,
        existingDispute.$id,
        {
          status: newStatus,
          deadlineAt:
            dispute?.seller_response_due_date ?? existingDispute.deadlineAt,
        },
      );

      break;
    }

    case "CUSTOMER.DISPUTE.RESOLVED": {
      const dispute = event.resource;
      const { databases } = await createAdminClient();

      if (!dispute?.dispute_id) break;

      const disputesResult = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.DISPUTES,
        [Query.equal("providerCaseId", dispute.dispute_id), Query.limit(1)],
      );

      const existingDispute = disputesResult.documents[0] as unknown as
        | DisputeDoc
        | undefined;
      if (!existingDispute) break;

      // Map outcome: RESOLVED_BUYER_FAVOUR → lost, RESOLVED_SELLER_FAVOUR → won
      const outcomeCode = dispute?.dispute_outcome?.outcome_code ?? "";
      const isWon = outcomeCode === "RESOLVED_SELLER_FAVOUR";

      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.DISPUTES,
        existingDispute.$id,
        { status: isWon ? "won" : "lost" },
      );

      if (isWon) {
        // Dispute won — restore order to paid
        await databases.updateDocument(
          DATABASE_ID,
          COLLECTIONS.ORDERS,
          existingDispute.orderId,
          { status: "paid" },
        );
      }

      break;
    }
  }

  return NextResponse.json({ received: true });
}
