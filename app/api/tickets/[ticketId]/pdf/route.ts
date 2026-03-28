"use server";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createSessionClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";
import { generateTicketPDF, type TicketPDFData } from "@/lib/tickets/pdf";
import { formatDate } from "@/lib/utils";
import type { TicketDoc, EventDoc, TicketTierDoc, VenueDoc } from "@/lib/appwrite/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> },
) {
  const { ticketId } = await params;

  // Auth
  const sessionClient = await createSessionClient();
  if (!sessionClient) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const user = await sessionClient.account.get();
  const { databases } = await createAdminClient();

  // Fetch ticket
  let ticket: TicketDoc;
  try {
    ticket = (await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.TICKETS,
      ticketId,
    )) as unknown as TicketDoc;
  } catch {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  // Ownership check
  if (ticket.ownerId !== user.$id) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  // Fetch related data
  const [eventResult, tierResult] = await Promise.all([
    databases.getDocument(DATABASE_ID, COLLECTIONS.EVENTS, ticket.eventId).catch(() => null),
    ticket.tierId
      ? databases.getDocument(DATABASE_ID, COLLECTIONS.TICKET_TIERS, ticket.tierId).catch(() => null)
      : null,
  ]);

  const event = eventResult as unknown as EventDoc | null;
  const tier = tierResult as unknown as TicketTierDoc | null;

  let venue: VenueDoc | null = null;
  if (event?.venueId) {
    venue = (await databases
      .getDocument(DATABASE_ID, COLLECTIONS.VENUES, event.venueId)
      .catch(() => null)) as unknown as VenueDoc | null;
  }

  // Build PDF data
  const pdfData: TicketPDFData = {
    eventTitle: event?.title ?? "Event",
    eventDate: event
      ? formatDate(event.startsAt, { dateStyle: "full", timeStyle: "short" })
      : "TBA",
    venue: venue?.name ?? "Venue TBA",
    tierName: tier?.name ?? "General",
    ticketCode: ticket.ticketCode,
    quantity: 1,
    totalAmount: tier ? String(tier.price) : "0",
    currency: tier?.currency ?? "USD",
    qrCodeData: ticket.ticketCode,
  };

  // Generate PDF
  const pdfBuffer = await generateTicketPDF(pdfData);

  // Return as downloadable PDF
  const filename = `RiffOff-${ticket.ticketCode}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-cache",
    },
  });
}
