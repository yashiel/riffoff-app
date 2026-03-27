import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/payments/stripe/client";
import { issueTicketsForOrder } from "@/lib/tickets/issue";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  const stripe = getStripe();

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const orderId = session.metadata?.orderId;

      if (!orderId) {
        console.error("Stripe webhook: missing orderId in metadata");
        break;
      }

      const { alreadyProcessed } = await issueTicketsForOrder(
        orderId,
        session.id,
      );

      // alreadyProcessed check ensures idempotent webhook handling
      break;
    }

    case "payment_intent.payment_failed": {
      console.warn("Stripe payment failed:", event.data.object.id);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
