"use server";

import { Query } from "node-appwrite";
import { createAdminClient, createSessionClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";
import { verifyTicketToken } from "@/lib/tickets/sign";
import type {
  TicketDoc,
  TicketTierDoc,
  EventDoc,
  ProfileDoc,
} from "@/lib/appwrite/types";

// ─── Types ───────────────────────────────────────────

export type ScanResult =
  | { valid: true; ticket: CheckedInTicket }
  | { valid: false; reason: string; code: ScanErrorCode };

export type ScanErrorCode =
  | "INVALID_TOKEN"
  | "EXPIRED_TOKEN"
  | "TICKET_NOT_FOUND"
  | "ALREADY_CHECKED_IN"
  | "TICKET_CANCELLED"
  | "WRONG_EVENT"
  | "NOT_AUTHORIZED"
  | "SERVER_ERROR";

export interface CheckedInTicket {
  ticketId: string;
  ticketCode: string;
  tierName: string;
  attendeeName: string;
  checkedInAt: string;
  eventTitle: string;
}

export interface ScanHistoryEntry {
  ticketId: string;
  ticketCode: string;
  tierName: string;
  attendeeName: string;
  checkedInAt: string;
  scannedBy: string;
}

export interface ScannerEventStats {
  eventId: string;
  eventTitle: string;
  totalTickets: number;
  checkedIn: number;
  startsAt: string;
}

// ─── Validate & Check-In ─────────────────────────────

/** Validate a QR token and check the attendee in */
export async function validateAndCheckIn(
  qrToken: string,
  eventId: string,
): Promise<ScanResult> {
  // 1. Verify the QR token signature + expiry
  const payload = verifyTicketToken(qrToken);
  if (!payload) {
    return { valid: false, reason: "Invalid or expired QR code", code: "INVALID_TOKEN" };
  }

  // 2. Verify token is for this event
  if (payload.eventId !== eventId) {
    return { valid: false, reason: "Ticket is for a different event", code: "WRONG_EVENT" };
  }

  // 3. Auth — scanner must be logged in
  const sessionClient = await createSessionClient();
  if (!sessionClient) {
    return { valid: false, reason: "Scanner not authenticated", code: "NOT_AUTHORIZED" };
  }

  const user = await sessionClient.account.get();
  const { databases } = await createAdminClient();

  // 4. Verify scanner is the event organiser (or has scanner role)
  let event: EventDoc;
  try {
    event = (await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.EVENTS,
      eventId,
    )) as unknown as EventDoc;
  } catch {
    return { valid: false, reason: "Event not found", code: "SERVER_ERROR" };
  }

  if (event.organiserId !== user.$id) {
    return { valid: false, reason: "Not authorized to scan for this event", code: "NOT_AUTHORIZED" };
  }

  // 5. Look up the ticket
  let ticket: TicketDoc;
  try {
    ticket = (await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.TICKETS,
      payload.ticketId,
    )) as unknown as TicketDoc;
  } catch {
    return { valid: false, reason: "Ticket not found", code: "TICKET_NOT_FOUND" };
  }

  // 6. Check ticket status
  if (ticket.status === "void" || ticket.status === "refunded") {
    return { valid: false, reason: `Ticket is ${ticket.status}`, code: "TICKET_CANCELLED" };
  }

  if (ticket.checkedInAt) {
    return {
      valid: false,
      reason: `Already checked in at ${new Date(ticket.checkedInAt).toLocaleTimeString()}`,
      code: "ALREADY_CHECKED_IN",
    };
  }

  // 7. Perform check-in
  const now = new Date().toISOString();
  try {
    await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.TICKETS,
      ticket.$id,
      {
        checkedInAt: now,
        checkedInBy: user.$id,
      },
    );
  } catch {
    return { valid: false, reason: "Failed to check in", code: "SERVER_ERROR" };
  }

  // 8. Fetch tier name + attendee name for display
  const [tier, profile] = await Promise.all([
    databases
      .getDocument(DATABASE_ID, COLLECTIONS.TICKET_TIERS, ticket.tierId)
      .catch(() => null),
    databases
      .listDocuments(DATABASE_ID, COLLECTIONS.PROFILES, [
        Query.equal("userId", ticket.ownerId),
        Query.limit(1),
      ])
      .then((r) => (r.documents[0] as unknown as ProfileDoc) ?? null)
      .catch(() => null),
  ]);

  return {
    valid: true,
    ticket: {
      ticketId: ticket.$id,
      ticketCode: ticket.ticketCode,
      tierName: (tier as unknown as TicketTierDoc)?.name ?? "—",
      attendeeName: profile?.displayName ?? "Guest",
      checkedInAt: now,
      eventTitle: event.title,
    },
  };
}

// ─── Scanner Stats ───────────────────────────────────

/** Get check-in stats for an event */
export async function getScannerStats(
  eventId: string,
): Promise<ScannerEventStats | null> {
  const sessionClient = await createSessionClient();
  if (!sessionClient) return null;

  const user = await sessionClient.account.get();
  const { databases } = await createAdminClient();

  let event: EventDoc;
  try {
    event = (await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.EVENTS,
      eventId,
    )) as unknown as EventDoc;
  } catch {
    return null;
  }

  if (event.organiserId !== user.$id) return null;

  const [allTickets, checkedIn] = await Promise.all([
    databases.listDocuments(DATABASE_ID, COLLECTIONS.TICKETS, [
      Query.equal("eventId", eventId),
      Query.limit(1),
    ]),
    databases.listDocuments(DATABASE_ID, COLLECTIONS.TICKETS, [
      Query.equal("eventId", eventId),
      Query.isNotNull("checkedInAt"),
      Query.limit(1),
    ]),
  ]);

  return {
    eventId,
    eventTitle: event.title,
    totalTickets: allTickets.total,
    checkedIn: checkedIn.total,
    startsAt: event.startsAt,
  };
}

// ─── Scan History ────────────────────────────────────

/** Get recent check-in history for an event */
export async function getScanHistory(
  eventId: string,
  limit = 20,
): Promise<ScanHistoryEntry[]> {
  const sessionClient = await createSessionClient();
  if (!sessionClient) return [];

  const user = await sessionClient.account.get();
  const { databases } = await createAdminClient();

  // Verify organiser
  let event: EventDoc;
  try {
    event = (await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.EVENTS,
      eventId,
    )) as unknown as EventDoc;
  } catch {
    return [];
  }

  if (event.organiserId !== user.$id) return [];

  const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.TICKETS, [
    Query.equal("eventId", eventId),
    Query.isNotNull("checkedInAt"),
    Query.orderDesc("checkedInAt"),
    Query.limit(limit),
  ]);

  const tickets = result.documents as unknown as TicketDoc[];
  if (tickets.length === 0) return [];

  // Batch fetch tiers + profiles
  const tierIds = [...new Set(tickets.map((t) => t.tierId).filter(Boolean))];
  const ownerIds = [...new Set(tickets.map((t) => t.ownerId))];

  const tierMap = new Map<string, string>();
  const profileMap = new Map<string, string>();

  const [tiers, profiles] = await Promise.all([
    Promise.all(
      tierIds.map((id) =>
        databases.getDocument(DATABASE_ID, COLLECTIONS.TICKET_TIERS, id).catch(() => null),
      ),
    ),
    Promise.all(
      ownerIds.map((id) =>
        databases
          .listDocuments(DATABASE_ID, COLLECTIONS.PROFILES, [
            Query.equal("userId", id),
            Query.limit(1),
          ])
          .then((r) => (r.documents[0] as unknown as ProfileDoc) ?? null)
          .catch(() => null),
      ),
    ),
  ]);

  for (const t of tiers) {
    if (t) tierMap.set(t.$id, (t as unknown as TicketTierDoc).name);
  }
  for (const p of profiles) {
    if (p) profileMap.set(p.userId, p.displayName ?? "Guest");
  }

  return tickets.map((ticket) => ({
    ticketId: ticket.$id,
    ticketCode: ticket.ticketCode,
    tierName: tierMap.get(ticket.tierId) ?? "—",
    attendeeName: profileMap.get(ticket.ownerId) ?? "Guest",
    checkedInAt: ticket.checkedInAt!,
    scannedBy: ticket.checkedInBy ?? "—",
  }));
}

// ─── Organiser Events for Scanner ────────────────────

/** Get active events for the scanner (events the organiser owns that are today/upcoming) */
export async function getScannerEvents(): Promise<ScannerEventStats[]> {
  const sessionClient = await createSessionClient();
  if (!sessionClient) return [];

  const user = await sessionClient.account.get();
  const { databases } = await createAdminClient();

  // Get organiser's published events happening today or in the near future
  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);

  const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.EVENTS, [
    Query.equal("organiserId", user.$id),
    Query.equal("status", "published"),
    Query.greaterThanEqual("endsAt", dayStart.toISOString()),
    Query.orderAsc("startsAt"),
    Query.limit(10),
  ]);

  const events = result.documents as unknown as EventDoc[];
  if (events.length === 0) return [];

  // Get ticket counts per event
  const stats = await Promise.all(
    events.map(async (event) => {
      const [total, checkedIn] = await Promise.all([
        databases.listDocuments(DATABASE_ID, COLLECTIONS.TICKETS, [
          Query.equal("eventId", event.$id),
          Query.limit(1),
        ]),
        databases.listDocuments(DATABASE_ID, COLLECTIONS.TICKETS, [
          Query.equal("eventId", event.$id),
          Query.isNotNull("checkedInAt"),
          Query.limit(1),
        ]),
      ]);

      return {
        eventId: event.$id,
        eventTitle: event.title,
        totalTickets: total.total,
        checkedIn: checkedIn.total,
        startsAt: event.startsAt,
      };
    }),
  );

  return stats;
}
