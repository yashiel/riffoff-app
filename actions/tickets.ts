"use server";

import { Query } from "node-appwrite";
import { createAdminClient, createSessionClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";
import { signTicketToken } from "@/lib/tickets/sign";
import { generateNonce, hashNonce } from "@/lib/tickets/codes";
import type {
  TicketDoc,
  EventDoc,
  TicketTierDoc,
  VenueDoc,
} from "@/lib/appwrite/types";

export interface TicketWithDetails extends TicketDoc {
  event: EventDoc | null;
  tier: TicketTierDoc | null;
  venue: VenueDoc | null;
}

/** Get all tickets for the current logged-in user */
export async function getUserTickets(): Promise<TicketWithDetails[]> {
  const sessionClient = await createSessionClient();
  if (!sessionClient) return [];

  const user = await sessionClient.account.get();
  const { databases } = await createAdminClient();

  const result = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.TICKETS,
    [
      Query.equal("ownerId", user.$id),
      Query.orderDesc("$createdAt"),
      Query.limit(100),
    ],
  );

  const tickets = result.documents as unknown as TicketDoc[];
  if (tickets.length === 0) return [];

  // Batch-fetch related events, tiers, venues
  const eventIds = [...new Set(tickets.map((t) => t.eventId))];
  const tierIds = [...new Set(tickets.map((t) => t.tierId).filter(Boolean))];

  const [eventsResult, tiersResult] = await Promise.all([
    Promise.all(
      eventIds.map((id) =>
        databases
          .getDocument(DATABASE_ID, COLLECTIONS.EVENTS, id)
          .catch(() => null),
      ),
    ),
    Promise.all(
      tierIds.map((id) =>
        databases
          .getDocument(DATABASE_ID, COLLECTIONS.TICKET_TIERS, id)
          .catch(() => null),
      ),
    ),
  ]);

  const eventMap = new Map<string, EventDoc>();
  for (const e of eventsResult) {
    if (e) eventMap.set(e.$id, e as unknown as EventDoc);
  }

  const tierMap = new Map<string, TicketTierDoc>();
  for (const t of tiersResult) {
    if (t) tierMap.set(t.$id, t as unknown as TicketTierDoc);
  }

  // Fetch venues for events
  const venueIds = [
    ...new Set(
      [...eventMap.values()].map((e) => e.venueId).filter(Boolean),
    ),
  ];
  const venuesResult = await Promise.all(
    venueIds.map((id) =>
      databases
        .getDocument(DATABASE_ID, COLLECTIONS.VENUES, id)
        .catch(() => null),
    ),
  );
  const venueMap = new Map<string, VenueDoc>();
  for (const v of venuesResult) {
    if (v) venueMap.set(v.$id, v as unknown as VenueDoc);
  }

  return tickets.map((ticket) => {
    const event = eventMap.get(ticket.eventId) ?? null;
    return {
      ...ticket,
      event,
      tier: tierMap.get(ticket.tierId) ?? null,
      venue: event ? venueMap.get(event.venueId) ?? null : null,
    };
  });
}

/**
 * Generate a fresh signed QR token for a ticket.
 * Only works for active tickets owned by the current user.
 * Returns the token string (to be encoded as QR) and expiry timestamp.
 */
export async function getTicketToken(
  ticketId: string,
): Promise<{ token: string; expiresAt: number } | { error: string }> {
  const sessionClient = await createSessionClient();
  if (!sessionClient) return { error: "Not authenticated" };

  const user = await sessionClient.account.get();
  const { databases } = await createAdminClient();

  let ticket: TicketDoc;
  try {
    ticket = (await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.TICKETS,
      ticketId,
    )) as unknown as TicketDoc;
  } catch {
    return { error: "Ticket not found" };
  }

  // Ownership check
  if (ticket.ownerId !== user.$id) {
    return { error: "Ticket not found" };
  }

  // Status check
  if (ticket.status !== "active") {
    return { error: "This ticket is no longer valid" };
  }

  // Generate fresh nonce and update stored hash
  const nonce = generateNonce();
  const nonceHash = hashNonce(nonce);

  await databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.TICKETS,
    ticketId,
    { qrNonceHash: nonceHash },
  );

  // Sign token with 24h expiry
  const exp = Math.floor(Date.now() / 1000) + 24 * 60 * 60;
  const token = signTicketToken({
    ticketId: ticket.$id,
    eventId: ticket.eventId,
    nonce,
    exp,
  });

  return { token, expiresAt: exp };
}
