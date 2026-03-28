import { NextRequest, NextResponse } from "next/server";
import { revokeSession } from "@/lib/gate/session";

export async function POST(request: NextRequest) {
  try {
    // Accept session from cookie OR Authorization header
    const authHeader = request.headers.get("authorization");
    const sessionId =
      request.cookies.get("riffoff-gate-session")?.value ||
      (authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null);

    if (!sessionId) {
      return NextResponse.json({ error: "No session" }, { status: 401 });
    }

    // Revoke the session in the database
    await revokeSession(sessionId);

    // Clear the cookie
    const response = NextResponse.json({ success: true }, { status: 200 });
    response.cookies.set("riffoff-gate-session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      path: "/api/gate",
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error("[GATE LOGOUT] Error:", error);
    return NextResponse.json({ success: true }, { status: 200 }); // Still return success
  }
}
