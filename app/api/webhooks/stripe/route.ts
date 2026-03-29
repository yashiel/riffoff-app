import { NextRequest, NextResponse } from "next/server";
import { ID, Query } from "node-appwrite";
import { getStripe } from "@/lib/payments/stripe/client";
import { issueTicketsForOrder } from "@/lib/tickets/issue";
import { createAdminClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";
import type { DisputeDoc, OrderDoc } from "@/lib/appwrite/types";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  const stripe = getStripe();

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const orderId = session.metadata?.orderId;

      if (!orderId) {
        break;
      }

      await issueTicketsForOrder(
        orderId,
        session.id,
      );

      break;
    }

    case "payment_intent.payment_failed": {
      break;
    }

    case "charge.dispute.created": {
      const dispute = event.data.object;
      const { databases } = await createAdminClient();

      // Find the order by providerRef matching the dispute's payment_intent
      const paymentIntent =
        typeof dispute.payment_intent === "string"
          ? dispute.payment_intent
          : dispute.payment_intent?.id ?? "";

      const ordersResult = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.ORDERS,
        [Query.equal("providerRef", paymentIntent), Query.limit(1)],
      );

      const order = ordersResult.documents[0] as unknown as
        | OrderDoc
        | undefined;
      if (!order) {
        break;
      }

      // Create DisputeDoc in Appwrite
      const deadlineAt = dispute.evidence_details?.due_by
        ? new Date(dispute.evidence_details.due_by * 1000).toISOString()
        : null;

      await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.DISPUTES,
        ID.unique(),
        {
          provider: "stripe",
          orderId: order.$id,
          providerCaseId: dispute.id,
          status: "needs_response",
          deadlineAt,
          reason: dispute.reason ?? null,
          amount: dispute.amount ?? order.amount,
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

    case "charge.dispute.updated": {
      const dispute = event.data.object;
      const { databases } = await createAdminClient();

      // Find existing DisputeDoc by providerCaseId
      const disputesResult = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.DISPUTES,
        [Query.equal("providerCaseId", dispute.id), Query.limit(1)],
      );

      const existingDispute = disputesResult.documents[0] as unknown as
        | DisputeDoc
        | undefined;
      if (!existingDispute) break;

      // Map Stripe dispute status to our status
      let newStatus: string = existingDispute.status;
      if (dispute.status === "needs_response") {
        newStatus = "needs_response";
      } else if (dispute.status === "under_review") {
        newStatus = "submitted";
      } else if (dispute.status === "won") {
        newStatus = "won";
      } else if (dispute.status === "lost") {
        newStatus = "lost";
      }

      // Update deadline if changed
      const deadlineAt = dispute.evidence_details?.due_by
        ? new Date(dispute.evidence_details.due_by * 1000).toISOString()
        : existingDispute.deadlineAt;

      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.DISPUTES,
        existingDispute.$id,
        { status: newStatus, deadlineAt },
      );

      break;
    }

    case "charge.dispute.closed": {
      const dispute = event.data.object;
      const { databases } = await createAdminClient();

      // Find existing DisputeDoc by providerCaseId
      const disputesResult = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.DISPUTES,
        [Query.equal("providerCaseId", dispute.id), Query.limit(1)],
      );

      const existingDispute = disputesResult.documents[0] as unknown as
        | DisputeDoc
        | undefined;
      if (!existingDispute) break;

      const isWon = dispute.status === "won";
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
      // If lost, order stays as disputed — admin can process refund via the disputes panel

      break;
    }
  }

  return NextResponse.json({ received: true });
}
