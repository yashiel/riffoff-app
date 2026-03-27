import { NextRequest, NextResponse } from "next/server";
import { validateSession, updateLastSeen } from "@/lib/gate/session";

export async function GET(request: NextRequest) {
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

    // Update last seen timestamp
    await updateLastSeen(session.sessionId);

    return NextResponse.json(
      {
        serverTime: new Date().toISOString(),
        sessionValid: true,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[GATE STATUS] Error:", error);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}
