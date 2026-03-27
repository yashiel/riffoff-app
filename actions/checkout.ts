"use server";

import { ID } from "node-appwrite";
import { redirect } from "next/navigation";
import { z } from "zod/v4";
import { createAdminClient, createSessionClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";
import { createReservation } from "./reservations";
import { createStripeCheckoutSession } from "@/lib/payments/stripe/checkout";
import { createTNGPayment } from "@/lib/payments/tng/payments";
import type { TicketTierDoc, EventDoc, PaymentProvider } from "@/lib/appwrite/types";
import type { CheckoutResult } from "@/lib/payments/types";
import crypto from "crypto";

const checkoutSchema = z.object({
  eventId: z.string().min(1),
  tierId: z.string().min(1),
  qty: z.number().int().min(1).max(10),
  provider: z.enum(["stripe", "paypal", "tng"]),
});

/**
 * Main checkout orchestrator:
 * 1. Validate input
 * 2. Create reservation (oversell prevention)
 * 3. Create order (status: pending)
 * 4. Create provider checkout session
 * 5. Return redirect URL or PayPal order ID
 */
export async function initiateCheckout(
  input: z.infer<typeof checkoutSchema>,
): Promise<CheckoutResult> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Invalid checkout input", orderId: "", reservationId: "" };
  }

  const { eventId, tierId, qty, provider } = parsed.data;

  const sessionClient = await createSessionClient();
  if (!sessionClient) {
    return { error: "Please log in to purchase", orderId: "", reservationId: "" };
  }

  const user = await sessionClient.account.get();
  const { databases } = await createAdminClient();

  // Get event and tier
  let event: EventDoc;
  let tier: TicketTierDoc;
  try {
    event = (await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.EVENTS,
      eventId,
    )) as unknown as EventDoc;
    tier = (await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.TICKET_TIERS,
      tierId,
    )) as unknown as TicketTierDoc;
  } catch {
    return { error: "Event or tier not found", orderId: "", reservationId: "" };
  }

  if (event.status !== "published") {
    return { error: "Event is not available", orderId: "", reservationId: "" };
  }

  // Server-side amount calculation (never trust client)
  const amountCents = Math.round(tier.price * 100) * qty;

  // Create reservation
  const reservationResult = await createReservation(eventId, tierId, qty);
  if (reservationResult.error || !reservationResult.reservation) {
    return {
      error: reservationResult.error ?? "Failed to reserve tickets",
      orderId: "",
      reservationId: "",
    };
  }

  const reservation = reservationResult.reservation;

  // Create order — providerRef and idempotencyKey must be unique (Appwrite indexes),
  // so use unique placeholders until the real values are set
  const orderId = ID.unique();
  const idempotencyKey = crypto
    .createHash("sha256")
    .update(`${user.$id}:${reservation.$id}:${provider}:${orderId}`)
    .digest("hex");

  let order;
  try {
    order = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.ORDERS,
      orderId,
      {
        userId: user.$id,
        eventId,
        provider: provider as PaymentProvider,
        status: "pending",
        amount: amountCents,
        currency: tier.currency,
        providerRef: `pending_${orderId}`,
        idempotencyKey,
      },
    );
  } catch (err) {
    console.error("Order creation failed:", err);
    return { error: "Failed to create order. Please try again.", orderId: "", reservationId: "" };
  }

  // Link reservation to order
  await databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.RESERVATIONS,
    reservation.$id,
    { orderId: order.$id },
  );

  // Create provider-specific checkout
  const result: CheckoutResult = {
    orderId: order.$id,
    reservationId: reservation.$id,
  };

  try {
    switch (provider) {
      case "stripe": {
        const stripeSession = await createStripeCheckoutSession({
          orderId: order.$id,
          eventTitle: event.title,
          tierName: tier.name,
          amountCents: Math.round(tier.price * 100),
          currency: tier.currency,
          qty,
          customerEmail: user.email,
        });
        await databases.updateDocument(
          DATABASE_ID,
          COLLECTIONS.ORDERS,
          order.$id,
          { providerRef: stripeSession.sessionId },
        );
        result.redirectUrl = stripeSession.url;
        break;
      }

      case "paypal": {
        // PayPal order created via client-side API route
        result.paypalOrderId = order.$id;
        break;
      }

      case "tng": {
        const tngResult = await createTNGPayment({
          orderId: order.$id,
          amountCents,
          eventTitle: event.title,
        });

        if (tngResult.resultStatus === "A" && tngResult.redirectUrl) {
          result.redirectUrl = tngResult.redirectUrl;
        } else if (tngResult.resultStatus === "F") {
          result.error = tngResult.error ?? "TNG payment failed";
        }
        break;
      }
    }
  } catch (error) {
    console.error(`Checkout error (${provider}):`, error);
    result.error = "Failed to create payment session. Please try again.";
  }

  // For Stripe and TNG, redirect immediately.
  // redirect() must be called OUTSIDE try/catch — it throws a special Next.js error.
  const redirectUrl = !result.error ? result.redirectUrl : undefined;

  if (redirectUrl) {
    redirect(redirectUrl);
  }

  return result;
}
