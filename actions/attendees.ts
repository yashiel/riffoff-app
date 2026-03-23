"use server";

import { Query } from "node-appwrite";
import { createAdminClient, createSessionClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";
import type {
  TicketDoc,
  TicketTierDoc,
  ProfileDoc,
  EventDoc,
} from "@/lib/appwrite/types";

export interface AttendeeRow {
  ticketId: string;
  ticketCode: string;
  status: string;
  tierName: string;
  attendeeName: string;
  attendeeEmail: string;
  checkedIn: boolean;
  checkedInAt: string | null;
}

/** Get attendee list for an event (organiser view) */
export async function getEventAttendees(
  eventId: string,
): Promise<AttendeeRow[]> {
  const sessionClient = await createSessionClient();
  if (!sessionClient) return [];

  const user = await sessionClient.account.get();
  const { databases } = await createAdminClient();

  // Verify ownership
  const event = (await databases.getDocument(
    DATABASE_ID,
    COLLECTIONS.EVENTS,
    eventId,
  )) as unknown as EventDoc;

  if (event.organiserId !== user.$id) return [];

  // Get tickets
  const ticketsResult = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.TICKETS,
    [Query.equal("eventId", eventId), Query.limit(500)],
  );

  const tickets = ticketsResult.documents as unknown as TicketDoc[];
  if (tickets.length === 0) return [];

  // Fetch tiers
  const tierIds = [...new Set(tickets.map((t) => t.tierId).filter(Boolean))];
  const tierMap = new Map<string, string>();
  if (tierIds.length > 0) {
    const tiers = await Promise.all(
      tierIds.map((id) =>
        databases.getDocument(DATABASE_ID, COLLECTIONS.TICKET_TIERS, id).catch(() => null),
      ),
    );
    for (const t of tiers) {
      if (t) tierMap.set(t.$id, (t as unknown as TicketTierDoc).name);
    }
  }

  // Fetch owner profiles
  const ownerIds = [...new Set(tickets.map((t) => t.ownerId))];
  const profileMap = new Map<string, ProfileDoc>();
  if (ownerIds.length > 0) {
    const profiles = await Promise.all(
      ownerIds.map((id) =>
        databases
          .listDocuments(DATABASE_ID, COLLECTIONS.PROFILES, [
            Query.equal("userId", id),
            Query.limit(1),
          ])
          .then((r) => (r.documents[0] as unknown as ProfileDoc) ?? null)
          .catch(() => null),
      ),
    );
    for (const p of profiles) {
      if (p) profileMap.set(p.userId, p);
    }
  }

  return tickets.map((ticket) => {
    const profile = profileMap.get(ticket.ownerId);
    return {
      ticketId: ticket.$id,
      ticketCode: ticket.ticketCode,
      status: ticket.status,
      tierName: tierMap.get(ticket.tierId) ?? "—",
      attendeeName: profile?.displayName ?? "Unknown",
      attendeeEmail: "—", // Email from Appwrite Auth, not stored in profile
      checkedIn: !!ticket.checkedInAt,
      checkedInAt: ticket.checkedInAt,
    };
  });
}

/** Export attendees as CSV string */
export async function exportAttendeesCSV(eventId: string): Promise<string> {
  const attendees = await getEventAttendees(eventId);

  const headers = [
    "Ticket Code",
    "Attendee Name",
    "Tier",
    "Status",
    "Checked In",
    "Checked In At",
  ];

  const rows = attendees.map((a) => [
    a.ticketCode,
    `"${a.attendeeName.replace(/"/g, '""')}"`,
    a.tierName,
    a.status,
    a.checkedIn ? "Yes" : "No",
    a.checkedInAt ?? "",
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}
