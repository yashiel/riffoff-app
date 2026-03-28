"use server";

import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";
import { generateTicketCode, generateNonce, hashNonce } from "./codes";
import { notifyTicketPurchased } from "@/actions/notifications";
import { sendTicketConfirmationEmail } from "@/lib/email";
import type { TicketDoc, OrderDoc } from "@/lib/appwrite/types";

/**
 * Issue tickets for a paid order. Called from webhook handlers.
 * Idempotent — checks if tickets already exist for this order.
 *
 * Flow:
 * 1. Check idempotency (skip if tickets already issued)
 * 2. Mark order as paid
 * 3. Convert reservation to "converted"
 * 4. Create ticket documents (one per qty)
 * 5. Increment tier soldCount
 */
export async function issueTicketsForOrder(
  orderId: string,
  providerRef: string,
): Promise<{ tickets: TicketDoc[]; alreadyProcessed: boolean }> {
  const { databases } = await createAdminClient();

  // 1. Check idempotency — are tickets already issued for this order?
  const existingTickets = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.TICKETS,
    [Query.equal("orderId", orderId), Query.limit(1)],
  );

  if (existingTickets.total > 0) {
    return {
      tickets: existingTickets.documents as unknown as TicketDoc[],
      alreadyProcessed: true,
    };
  }

  // 2. Get the order
  const order = (await databases.getDocument(
    DATABASE_ID,
    COLLECTIONS.ORDERS,
    orderId,
  )) as unknown as OrderDoc;

  if (order.status === "paid") {
    // Already paid but somehow no tickets — shouldn't happen, but handle gracefully
    const tickets = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.TICKETS,
      [Query.equal("orderId", orderId)],
    );
    return {
      tickets: tickets.documents as unknown as TicketDoc[],
      alreadyProcessed: true,
    };
  }

  // 3. Mark order as paid
  await databases.updateDocument(DATABASE_ID, COLLECTIONS.ORDERS, orderId, {
    status: "paid",
    providerRef,
    paidAt: new Date().toISOString(),
  });

  // 4. Convert reservation
  const reservations = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.RESERVATIONS,
    [Query.equal("orderId", orderId), Query.limit(1)],
  );

  if (reservations.documents.length > 0) {
    await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.RESERVATIONS,
      reservations.documents[0].$id,
      { status: "converted" },
    );
  }

  // 5. Get the reservation details for qty and tier
  const reservation = reservations.documents[0] as unknown as {
    tierId: string;
    eventId: string;
    qty: number;
  } | undefined;

  // Fallback: get tier info from order if no reservation
  const eventId = order.eventId;
  const tierId = reservation?.tierId ?? "";
  const qty = reservation?.qty ?? 1;

  // 6. Create ticket documents
  const tickets: TicketDoc[] = [];
  for (let i = 0; i < qty; i++) {
    const nonce = generateNonce();
    const ticketCode = generateTicketCode();

    const ticket = (await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.TICKETS,
      ID.unique(),
      {
        orderId,
        eventId,
        tierId,
        ownerId: order.userId,
        status: "active",
        qrNonceHash: hashNonce(nonce),
        ticketCode,
        // Note: the raw nonce is NOT stored — it's returned to the client
        // for QR generation. The hash is used for verification.
      },
    )) as unknown as TicketDoc;

    tickets.push(ticket);
  }

  // 7. Increment tier soldCount
  if (tierId) {
    const tier = await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.TICKET_TIERS,
      tierId,
    );
    await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.TICKET_TIERS,
      tierId,
      { soldCount: (tier as unknown as { soldCount: number }).soldCount + qty },
    );
  }

  // 8. Send notification + email (non-blocking)
  const firstTicket = tickets[0];
  if (firstTicket) {
    // Get event + venue + tier details for notification and email
    let eventTitle = "your event";
    let eventDate = "";
    let venueName = "";
    let tierName = "";
    let userEmail = "";
    let userName = "";
    try {
      const event = await databases.getDocument(DATABASE_ID, COLLECTIONS.EVENTS, eventId);
      const eventData = event as unknown as { title: string; startsAt: string; venueId: string };
      eventTitle = eventData.title;
      eventDate = eventData.startsAt;

      // Get venue name
      if (eventData.venueId) {
        const venue = await databases.getDocument(DATABASE_ID, COLLECTIONS.VENUES, eventData.venueId);
        venueName = (venue as unknown as { name: string }).name;
      }

      if (tierId) {
        const tierDoc = await databases.getDocument(DATABASE_ID, COLLECTIONS.TICKET_TIERS, tierId);
        tierName = (tierDoc as unknown as { name: string }).name;
      }
      // Get user info for email
      const { users } = await createAdminClient();
      const user = await users.get(order.userId);
      userEmail = user.email;
      userName = user.name || "";
    } catch {
      // Non-critical — continue without email
    }

    // In-app notification
    void notifyTicketPurchased(order.userId, eventTitle, firstTicket.ticketCode, firstTicket.$id);

    // Email confirmation (non-blocking)
    if (userEmail) {
      void sendTicketConfirmationEmail(userEmail, {
        userName,
        eventTitle,
        eventDate,
        venue: venueName,
        tierName,
        ticketCode: firstTicket.ticketCode,
        quantity: qty,
        totalAmount: String(order.amount),
        currency: order.currency,
        qrCodeData: firstTicket.$id,
      });
    }
  }

  // 9. Audit log
  await databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.AUDIT_LOGS,
    ID.unique(),
    {
      actorId: null,
      action: "order.paid",
      entityType: "order",
      entityId: orderId,
      metadata: JSON.stringify({
        provider: order.provider,
        providerRef,
        ticketCount: qty,
        amount: order.amount,
        currency: order.currency,
      }),
    },
  );

  return { tickets, alreadyProcessed: false };
}
