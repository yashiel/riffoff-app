import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createSessionClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";
import type { TicketDoc } from "@/lib/appwrite/types";

/**
 * GET /api/tickets/[ticketId]/status
 *
 * Lightweight endpoint for attendee ticket status polling.
 * Returns only the check-in status — minimal payload, fast response.
 * Auth: requires valid Appwrite user session + ticket ownership.
 */
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

  try {
    const ticket = (await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.TICKETS,
      ticketId,
    )) as unknown as TicketDoc;

    // Ownership check
    if (ticket.ownerId !== user.$id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      status: ticket.status,
      checkedIn: !!ticket.checkedInAt,
      checkedInAt: ticket.checkedInAt ?? null,
    });
  } catch {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }
}
