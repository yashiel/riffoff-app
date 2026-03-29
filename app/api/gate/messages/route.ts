import { NextRequest, NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { validateSession } from "@/lib/gate/session";
import { createAdminClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";

/**
 * GET /api/gate/messages?since=ISO_DATE
 * Returns broadcast messages for the gate's event, optionally filtered by timestamp.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const sessionId =
      request.cookies.get("riffoff-gate-session")?.value ||
      (authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null);

    if (!sessionId) {
      return NextResponse.json({ error: "No session" }, { status: 401 });
    }

    const session = await validateSession(sessionId, {
      userAgent: request.headers.get("user-agent") ?? "",
      screenSize: request.headers.get("x-screen-size") ?? "",
      timezone: request.headers.get("x-timezone") ?? "",
      language: request.headers.get("x-language") ?? "",
    });

    if (!session) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const { databases } = await createAdminClient();
    const since = request.nextUrl.searchParams.get("since");

    const queries = [
      Query.equal("eventId", session.eventId),
      Query.orderDesc("$createdAt"),
      Query.limit(10),
    ];

    // Only fetch messages newer than 'since'
    if (since) {
      queries.push(Query.greaterThan("$createdAt", since));
    }

    const result = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.GATE_MESSAGES,
      queries,
    );

    const messages = result.documents.map((doc) => ({
      id: doc.$id,
      message: doc.message,
      gateId: doc.gateId || null,
      createdBy: doc.createdBy,
      createdAt: doc.$createdAt,
    }));

    return NextResponse.json({ messages }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}
