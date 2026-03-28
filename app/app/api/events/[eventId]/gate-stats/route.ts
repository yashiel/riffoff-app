import { NextRequest, NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { createAdminClient, createSessionClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";
import { isCurrentUserAdmin } from "@/lib/auth-utils";
import type { EventDoc } from "@/lib/appwrite/types";

interface GateStats {
  gateId: string;
  gateName: string;
  checkedIn: number;
  devices: number;
  conflicts: number;
}

export interface GateStatsResponse {
  total: { checkedIn: number; totalTickets: number };
  gates: GateStats[];
}

export async function getGateStats(eventId: string): Promise<GateStatsResponse> {
  const { databases } = await createAdminClient();

  // Fetch all check-ins for this event
  const checkins = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.GATE_CHECKINS,
    [
      Query.equal("eventId", eventId),
      Query.limit(5000),
    ],
  );

  // Fetch gates for this event
  const gates = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.GATES,
    [
      Query.equal("eventId", eventId),
      Query.orderAsc("sortOrder"),
      Query.limit(100),
    ],
  );

  // Count total tickets for event
  const tickets = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.TICKETS,
    [
      Query.equal("eventId", eventId),
      Query.equal("status", "active"),
      Query.limit(1),
      Query.select(["$id"]),
    ],
  );

  // Aggregate per-gate stats
  const gateMap = new Map<string, { checkedIn: number; devices: Set<string>; conflicts: number }>();

  for (const gate of gates.documents) {
    gateMap.set(gate.$id, { checkedIn: 0, devices: new Set(), conflicts: 0 });
  }

  for (const checkin of checkins.documents) {
    const stats = gateMap.get(checkin.gateId);
    if (stats) {
      stats.checkedIn++;
      stats.devices.add(checkin.deviceId);
      if (checkin.status === "conflicted") {
        stats.conflicts++;
      }
    }
  }

  const gateStats: GateStats[] = gates.documents.map((gate) => {
    const stats = gateMap.get(gate.$id);
    return {
      gateId: gate.$id,
      gateName: gate.name,
      checkedIn: stats?.checkedIn ?? 0,
      devices: stats?.devices.size ?? 0,
      conflicts: stats?.conflicts ?? 0,
    };
  });

  return {
    total: {
      checkedIn: checkins.total,
      totalTickets: tickets.total,
    },
    gates: gateStats,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    const { eventId } = await params;

    // Auth check
    const sessionClient = await createSessionClient();
    if (!sessionClient) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = await sessionClient.account.get();
    const { databases } = await createAdminClient();

    const event = await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.EVENTS,
      eventId,
    ) as unknown as EventDoc;

    const isAdmin = await isCurrentUserAdmin();
    if (event.organiserId !== user.$id && !isAdmin) {
      return NextResponse.json({ error: "Not authorized" }, { status: 404 });
    }

    const gateStatsData = await getGateStats(eventId);

    // Also fetch feed, devices, broadcasts for the polling dashboard
    const [recentCheckins, sessions, messages] = await Promise.all([
      databases.listDocuments(DATABASE_ID, COLLECTIONS.GATE_CHECKINS, [
        Query.equal("eventId", eventId),
        Query.orderDesc("scannedAt"),
        Query.limit(10),
      ]).catch(() => ({ documents: [] })),
      databases.listDocuments(DATABASE_ID, COLLECTIONS.GATE_SESSIONS, [
        Query.equal("eventId", eventId),
        Query.equal("status", "active"),
        Query.limit(100),
      ]).catch(() => ({ documents: [] })),
      databases.listDocuments(DATABASE_ID, COLLECTIONS.GATE_MESSAGES, [
        Query.equal("eventId", eventId),
        Query.orderDesc("$createdAt"),
        Query.limit(5),
      ]).catch(() => ({ documents: [] })),
    ]);

    // Build feed entries
    const gates = await databases.listDocuments(DATABASE_ID, COLLECTIONS.GATES, [
      Query.equal("eventId", eventId),
      Query.limit(100),
    ]).catch(() => ({ documents: [] }));

    const feed = await Promise.all(
      recentCheckins.documents.map(async (doc) => {
        let ticketCode = "";
        try {
          const ticket = await databases.getDocument(DATABASE_ID, COLLECTIONS.TICKETS, doc.ticketId as string);
          ticketCode = (ticket.ticketCode as string) || "";
        } catch { /* ticket might be deleted */ }
        const gate = gates.documents.find((g) => g.$id === doc.gateId);
        return {
          id: doc.$id,
          ticketCode,
          gateName: (gate?.name as string) || "Unknown",
          status: doc.status === "confirmed" ? "valid" : doc.status === "conflicted" ? "duplicate" : "invalid",
          timestamp: doc.scannedAt as string,
        };
      }),
    );

    const devices = sessions.documents.map((s) => ({
      sessionId: s.$id,
      deviceId: s.deviceId as string,
      gateId: s.gateId as string,
      status: s.status as string,
      lastSeenAt: s.lastSeenAt as string,
      userAgent: (s.userAgent as string) || "",
      screenSize: (s.screenSize as string) || "",
      timezone: (s.timezone as string) || "",
      language: (s.language as string) || "",
      deviceFingerprint: (s.deviceFingerprint as string) || "",
      issuedBy: (s.issuedBy as string) || "",
      createdAt: s.$createdAt as string,
    }));

    const broadcasts = messages.documents.map((msg) => ({
      id: msg.$id,
      message: msg.message as string,
      gateId: (msg.gateId as string) || null,
      createdAt: msg.$createdAt as string,
    }));

    return NextResponse.json({
      stats: gateStatsData,
      feed,
      devices,
      broadcasts,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch gate stats";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
