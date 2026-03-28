"use server";

import { getStripe } from "./client";

interface CreateStripeSessionInput {
  orderId: string;
  eventTitle: string;
  tierName: string;
  amountCents: number;
  currency: string;
  qty: number;
  customerEmail?: string;
}

export async function createStripeCheckoutSession(
  input: CreateStripeSessionInput,
): Promise<{ url: string; sessionId: string }> {
  const stripe = getStripe();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: input.currency.toLowerCase(),
          product_data: {
            name: `${input.eventTitle} — ${input.tierName}`,
          },
          unit_amount: input.amountCents,
        },
        quantity: input.qty,
      },
    ],
    metadata: {
      orderId: input.orderId,
    },
    customer_email: input.customerEmail,
    success_url: `${appUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/payment/cancel?order_id=${input.orderId}`,
  });

  return { url: session.url!, sessionId: session.id };
}
