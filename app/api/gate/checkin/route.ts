import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validateSession } from "@/lib/gate/session";
import { processCheckIn, type CheckInInput } from "@/lib/gate/conflicts";
import { createAdminClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";
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
    const scanRateLimit = checkScannerRateLimit(session.sessionId);
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

    // Get ticket details for the scanner UI
    let ticketCode = "";
    let attendeeName = "";
    let tierName = "";
    try {
      const { databases: db } = await createAdminClient();
      const ticket = await db.getDocument(DATABASE_ID, COLLECTIONS.TICKETS, parsed.data.ticketId);
      ticketCode = (ticket.ticketCode as string) || "";
      attendeeName = (ticket.attendeeName as string) || "";
      tierName = (ticket.tierName as string) || "";
    } catch { /* ticket details are optional for scan result */ }

    return NextResponse.json({
      status: statusMap[result.status] ?? result.status,
      reason: result.reason,
      ticketCode,
      attendeeName,
      tierName,
    }, { status: 200 });
  } catch (error) {
    console.error("[CHECKIN] Error:", error);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}
