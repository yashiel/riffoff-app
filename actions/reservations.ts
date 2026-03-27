"use server";

import crypto from "crypto";
import { ID, Query } from "node-appwrite";
import { createAdminClient, createSessionClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";
import { serialize } from "@/lib/utils";
import type { ReservationDoc, TicketTierDoc } from "@/lib/appwrite/types";

const HOLD_DURATION_MS = 15 * 60 * 1000; // 15 minutes

interface ReservationResult {
  reservation?: ReservationDoc;
  error?: string;
}

/**
 * Create a reservation (inventory hold) for oversell prevention.
 * Checks: tier exists, on sale, availability (soldCount + held < quota).
 */
export async function createReservation(
  eventId: string,
  tierId: string,
  qty: number,
): Promise<ReservationResult> {
  const sessionClient = await createSessionClient();
  if (!sessionClient) return { error: "Please log in to purchase tickets" };

  if (qty < 1 || qty > 10) return { error: "Quantity must be between 1 and 10" };

  const user = await sessionClient.account.get();
  const { databases } = await createAdminClient();

  // Get the tier
  let tier: TicketTierDoc;
  try {
    tier = (await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.TICKET_TIERS,
      tierId,
    )) as unknown as TicketTierDoc;
  } catch {
    return { error: "Ticket tier not found" };
  }

  if (tier.eventId !== eventId) return { error: "Invalid tier for this event" };

  // Check sale window
  const now = new Date();
  if (tier.saleStartsAt && new Date(tier.saleStartsAt) > now) {
    return { error: "Tickets are not yet on sale" };
  }
  if (tier.saleEndsAt && new Date(tier.saleEndsAt) < now) {
    return { error: "Ticket sales have ended" };
  }

  // Count active held reservations for this tier
  const heldReservations = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.RESERVATIONS,
    [
      Query.equal("tierId", tierId),
      Query.equal("status", "held"),
      Query.greaterThan("expiresAt", now.toISOString()),
    ],
  );

  const heldQty = heldReservations.documents.reduce(
    (sum, doc) => sum + ((doc as unknown as ReservationDoc).qty ?? 0),
    0,
  );

  // Check availability
  const available = tier.quota - tier.soldCount - heldQty;
  if (qty > available) {
    if (available <= 0) return { error: "Sold out" };
    return { error: `Only ${available} tickets available` };
  }

  // Generate idempotency key
  const timeBucket = Math.floor(Date.now() / 60000); // 1-minute bucket
  const idempotencyKey = crypto
    .createHash("sha256")
    .update(`${user.$id}:${tierId}:${qty}:${timeBucket}`)
    .digest("hex");

  // Check for existing reservation with same idempotency key
  const existing = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.RESERVATIONS,
    [
      Query.equal("idempotencyKey", idempotencyKey),
      Query.equal("status", "held"),
      Query.limit(1),
    ],
  );

  if (existing.documents.length > 0) {
    return {
      reservation: serialize(existing.documents[0] as unknown as ReservationDoc),
    };
  }

  // Create reservation
  const reservation = (await databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.RESERVATIONS,
    ID.unique(),
    {
      eventId,
      tierId,
      userId: user.$id,
      qty,
      status: "held",
      expiresAt: new Date(Date.now() + HOLD_DURATION_MS).toISOString(),
      idempotencyKey,
    },
  )) as unknown as ReservationDoc;

  return { reservation: serialize(reservation) };
}

/** Cancel a held reservation and release inventory */
export async function cancelReservation(
  reservationId: string,
): Promise<void> {
  // Auth check — user must be logged in
  const sessionClient = await createSessionClient();
  if (!sessionClient) return;

  const user = await sessionClient.account.get();
  const { databases } = await createAdminClient();

  try {
    // Fetch reservation and verify ownership before cancelling
    const reservation = await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.RESERVATIONS,
      reservationId,
    ) as unknown as ReservationDoc;

    if (reservation.userId !== user.$id) {
      // User doesn't own this reservation — silently return (404 pattern)
      return;
    }

    await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.RESERVATIONS,
      reservationId,
      { status: "cancelled" },
    );
  } catch {
    // Already cancelled or expired — fine
  }
}
