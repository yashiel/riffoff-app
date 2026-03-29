import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validateSession } from "@/lib/gate/session";
import { processBatchSync, type CheckInInput } from "@/lib/gate/conflicts";
import { checkScannerRateLimit } from "@/lib/security/rate-limit";

const MAX_BATCH_SIZE = 500;

const BatchCheckInSchema = z.object({
  checkIns: z
    .array(
      z.object({
        ticketId: z.string().min(1),
        scannedAt: z.string().datetime(),
      }),
    )
    .min(1, "At least one check-in is required")
    .max(MAX_BATCH_SIZE, `Maximum ${MAX_BATCH_SIZE} check-ins per batch`),
});

export async function POST(request: NextRequest) {
  try {
    // Validate session
    const authHeader = request.headers.get("authorization");
    const sessionId = request.cookies.get("riffoff-gate-session")?.value || (authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null);
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
    const parsed = BatchCheckInSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const inputs: CheckInInput[] = parsed.data.checkIns.map((ci) => ({
      ticketId: ci.ticketId,
      eventId: session.eventId,
      gateId: session.gateId,
      sessionId: session.sessionId,
      deviceId: session.deviceId,
      scannedAt: ci.scannedAt,
      offlineMode: true,
    }));

    const results = await processBatchSync(inputs);

    return NextResponse.json({ results }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}
