import { NextRequest, NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { validateSession } from "@/lib/gate/session";
import { buildManifest, type ManifestPublicKey, type GateConfig } from "@/lib/gate/manifest";
import { createAdminClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    const { eventId } = await params;

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

    // Verify session is for this event
    if (session.eventId !== eventId) {
      return NextResponse.json({ error: "Session does not match event" }, { status: 403 });
    }

    const { databases } = await createAdminClient();

    // Fetch active tickets for event
    const ticketResults = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.TICKETS,
      [
        Query.equal("eventId", eventId),
        Query.equal("status", "active"),
        Query.limit(5000),
      ],
    );

    const ticketIds = ticketResults.documents.map((doc) => doc.$id);

    // Fetch active signing keys
    const keyResults = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.SIGNING_KEYS,
      [Query.equal("active", true)],
    );

    const publicKeys: ManifestPublicKey[] = keyResults.documents.map((doc) => ({
      kid: doc.$id,
      key: doc.publicKey,
      active: doc.active,
      validUntil: doc.validUntil,
    }));

    // Fetch gate config
    let gateConfig: GateConfig = {
      gateId: session.gateId,
      gateName: session.gateId,
      lanes: 1,
    };

    try {
      const gateDoc = await databases.getDocument(
        DATABASE_ID,
        COLLECTIONS.GATES,
        session.gateId,
      );
      gateConfig = {
        gateId: gateDoc.$id,
        gateName: gateDoc.name || gateDoc.$id,
        lanes: gateDoc.lanes || 1,
      };
    } catch {
      // Use defaults if gate doc not found
    }

    const manifest = buildManifest(ticketIds, eventId, publicKeys, gateConfig);

    return NextResponse.json(manifest, {
      status: 200,
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("[MANIFEST] Error:", error);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}
