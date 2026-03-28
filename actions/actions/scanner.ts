"use server";

import { Query } from "node-appwrite";
import { createAdminClient, createSessionClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";
import { isCurrentUserAdmin } from "@/lib/auth-utils";
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

/** Validate a QR token and check the attendee in.
 *  Accepts EITHER a signed token (from refreshQR) OR a raw ticket ID / ticket code.
 *  This dual-path approach ensures scanning works regardless of QR format. */
export async function validateAndCheckIn(
  qrToken: string,
  eventId: string,
): Promise<ScanResult> {
  // 0. Auth — scanner must be logged in
  const sessionClient = await createSessionClient();
  if (!sessionClient) {
    return { valid: false, reason: "Scanner not authenticated", code: "NOT_AUTHORIZED" };
  }

  const user = await sessionClient.account.get();
  const { databases } = await createAdminClient();

  // 1. Verify scanner is the event organiser (or admin)
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

  const adminScan = await isCurrentUserAdmin();
  if (event.organiserId !== user.$id && !adminScan) {
    return { valid: false, reason: "Not authorized to scan for this event", code: "NOT_AUTHORIZED" };
  }

  // 2. Try to resolve the ticket — signed token first, then raw ID, then ticket code
  let ticket: TicketDoc | null = null;

  // Path A: Signed token (format: base64.base64)
  const payload = verifyTicketToken(qrToken);
  if (payload) {
    if (payload.eventId !== eventId) {
      return { valid: false, reason: "Ticket is for a different event", code: "WRONG_EVENT" };
    }
    try {
      ticket = (await databases.getDocument(
        DATABASE_ID,
        COLLECTIONS.TICKETS,
        payload.ticketId,
      )) as unknown as TicketDoc;
    } catch {
      return { valid: false, reason: "Ticket not found", code: "TICKET_NOT_FOUND" };
    }
  }

  // Path B: Raw ticket ID (document ID like "qa-ticket-1" or UUID)
  if (!ticket) {
    try {
      const doc = await databases.getDocument(
        DATABASE_ID,
        COLLECTIONS.TICKETS,
        qrToken.trim(),
      );
      ticket = doc as unknown as TicketDoc;
    } catch {
      // Not a valid document ID — try ticket code lookup
    }
  }

  // Path C: Ticket code (e.g., "RIFF-XXXXXX")
  if (!ticket) {
    try {
      const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.TICKETS, [
        Query.equal("ticketCode", qrToken.trim().toUpperCase()),
        Query.limit(1),
      ]);
      if (result.documents.length > 0) {
        ticket = result.documents[0] as unknown as TicketDoc;
      }
    } catch {
      // Lookup failed
    }
  }

  if (!ticket) {
    return { valid: false, reason: "Ticket not found — invalid QR code or ticket code", code: "TICKET_NOT_FOUND" };
  }

  // 3. Verify ticket belongs to this event
  if (ticket.eventId !== eventId) {
    return { valid: false, reason: "Ticket is for a different event", code: "WRONG_EVENT" };
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

  const adminStats = await isCurrentUserAdmin();
  if (event.organiserId !== user.$id && !adminStats) return null;

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

  const adminList = await isCurrentUserAdmin();
  if (event.organiserId !== user.$id && !adminList) return [];

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
