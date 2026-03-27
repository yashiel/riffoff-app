import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/gate/session";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    const { eventId } = await params;

    // Validate session
    const sessionId = request.cookies.get("riffoff-gate-session")?.value;
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

    if (session.eventId !== eventId) {
      return NextResponse.json({ error: "Session does not match event" }, { status: 403 });
    }

    return NextResponse.json({ version: Date.now() }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Version check failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
