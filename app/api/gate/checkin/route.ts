import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validateSession } from "@/lib/gate/session";
import { processCheckIn, type CheckInInput } from "@/lib/gate/conflicts";
import { createAdminClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";
import { Query } from "node-appwrite";
import { checkScannerRateLimit } from "@/lib/security/rate-limit";

const CheckInSchema = z.object({
  ticketId: z.string().min(1, "ticketId is required"),
  scannedAt: z.string().datetime({ message: "scannedAt must be a valid ISO datetime" }),
});

export async function POST(request: NextRequest) {
  try {
    // Validate session — accept cookie OR Authorization header (for cross-origin)
    const authHeader = request.headers.get("authorization");
    const sessionId =
      request.cookies.get("riffoff-gate-session")?.value ||
      (authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null);
    if (!sessionId) {
      return NextResponse.json({ error: "No session" }, { status: 401 });
    }

    const userAgent = request.headers.get("user-agent") ?? "unknown";
    const screenSize = request.headers.get("x-screen-size") ?? "unknown";
    const timezone = request.headers.get("x-timezone") ?? "unknown";
    const language = request.headers.get("x-language") ?? "unknown";

    const session = await validateSession(sessionId, {
      userAgent,
      screenSize,
      timezone,
      language,
    });

    if (!session) {
      return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
    }

    // Rate limit scanning by sessionId (120/min)
    const scanRateLimit = await checkScannerRateLimit(session.sessionId);
    if (!scanRateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many scan attempts. Please slow down." },
        { status: 429 },
      );
    }

    // Parse and validate body
    const body = await request.json();
    const parsed = CheckInSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const input: CheckInInput = {
      ticketId: parsed.data.ticketId,
      eventId: session.eventId,
      gateId: session.gateId,
      sessionId: session.sessionId,
      deviceId: session.deviceId,
      scannedAt: parsed.data.scannedAt,
      offlineMode: false,
    };

    const result = await processCheckIn(input);

    // Map internal statuses to scanner-friendly statuses
    const statusMap: Record<string, string> = {
      confirmed: "valid",
      rejected: "invalid",
      already_checked_in: "duplicate",
      conflicted: "conflict",
    };

    // Get ticket details + profile data for the scanner UI (single ticket fetch)
    let ticketCode = "";
    let attendeeName = "";
    let tierName = "";
    let attendeePhotoUrl: string | null = null;
    let seatInfo: string | null = null;
    let firstScannedAt: string | null = null;
    let firstScannedByGate: string | null = null;
    const checkedIn = 0;
    const total = 0;

    try {
      const { databases: adminDb } = await createAdminClient();

      // Single ticket fetch — extract all fields
      try {
        const ticket = await adminDb.getDocument(DATABASE_ID, COLLECTIONS.TICKETS, parsed.data.ticketId);
        ticketCode = (ticket.ticketCode as string) || "";
        attendeeName = (ticket.attendeeName as string) || "";
        tierName = (ticket.tierName as string) || "";
        seatInfo = (ticket.seatInfo as string) || null;

        // Tier name fallback: look up from tickettiers collection if not on ticket
        if (!tierName && ticket.tierId) {
          try {
            const tier = await adminDb.getDocument(DATABASE_ID, COLLECTIONS.TICKET_TIERS, ticket.tierId as string);
            tierName = (tier.name as string) || "";
          } catch { /* tier lookup optional */ }
        }

        // Look up profile for photo + display name fallback
        if (ticket.ownerId) {
          try {
            const profiles = await adminDb.listDocuments(DATABASE_ID, COLLECTIONS.PROFILES, [
              Query.equal("userId", ticket.ownerId as string),
              Query.limit(1),
            ]);
            if (profiles.documents.length > 0) {
              attendeePhotoUrl = (profiles.documents[0].photoUrl as string) || null;
              // Fall back to profile displayName if ticket has no attendeeName
              if (!attendeeName) {
                attendeeName = (profiles.documents[0].displayName as string) || "";
              }
            }
          } catch { /* profile lookup is optional */ }
        }
      } catch { /* ticket details are optional for scan result */ }

      // First scan info — only for duplicate scans
      if (result.status === "already_checked_in") {
        try {
          const firstCheckins = await adminDb.listDocuments(DATABASE_ID, COLLECTIONS.GATE_CHECKINS, [
            Query.equal("ticketId", parsed.data.ticketId),
            Query.equal("status", "confirmed"),
            Query.orderAsc("scannedAt"),
            Query.limit(1),
          ]);
          if (firstCheckins.documents.length > 0) {
            firstScannedAt = (firstCheckins.documents[0].scannedAt as string) || null;

            // Look up gate name
            const gateId = firstCheckins.documents[0].gateId as string;
            if (gateId) {
              try {
                const gate = await adminDb.getDocument(DATABASE_ID, COLLECTIONS.GATES, gateId);
                firstScannedByGate = (gate.name as string) || null;
              } catch { /* gate lookup is optional */ }
            }
          }
        } catch { /* first checkin lookup is optional */ }
      }

      // Event-wide counts removed — scanner gets these from SSE stats stream
      // This eliminates 2 DB queries per scan (major scaling improvement)
    } catch { /* all enhancement data is optional */ }

    return NextResponse.json({
      status: statusMap[result.status] ?? result.status,
      reason: result.reason,
      ticketCode,
      attendeeName,
      tierName,
      attendeePhotoUrl,
      seatInfo,
      firstScannedAt,
      firstScannedByGate,
      checkedIn,
      total,
    }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}
