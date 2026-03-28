import { NextRequest, NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { validateSession } from "@/lib/gate/session";
import { createAdminClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId: paramSessionId } = await params;

    // Validate session from cookie
    const cookieSessionId = request.cookies.get("riffoff-gate-session")?.value;
    if (!cookieSessionId) {
      return NextResponse.json({ error: "No session" }, { status: 401 });
    }

    // Ensure cookie session matches the requested session
    if (cookieSessionId !== paramSessionId) {
      return NextResponse.json({ error: "Session mismatch" }, { status: 403 });
    }

    const userAgent = request.headers.get("user-agent") ?? "unknown";
    const screenSize = request.headers.get("x-screen-size") ?? "unknown";
    const timezone = request.headers.get("x-timezone") ?? "unknown";
    const language = request.headers.get("x-language") ?? "unknown";

    const session = await validateSession(cookieSessionId, {
      userAgent,
      screenSize,
      timezone,
      language,
    });

    if (!session) {
      return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
    }

    const { databases } = await createAdminClient();

    // Query messages for this event (and optionally gate)
    const queries = [
      Query.equal("eventId", session.eventId),
      Query.orderDesc("$createdAt"),
      Query.limit(50),
    ];

    const messageResults = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.GATE_MESSAGES,
      queries,
    );

    // Filter to messages targeting this gate or broadcast (no specific gateId)
    const messages = messageResults.documents
      .filter((msg) => !msg.gateId || msg.gateId === session.gateId)
      .map((msg) => ({
        id: msg.$id,
        type: msg.type,
        content: msg.content,
        priority: msg.priority,
        createdAt: msg.$createdAt,
      }));

    return NextResponse.json({ messages }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch messages";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
