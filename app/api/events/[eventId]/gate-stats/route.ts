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

    // Batch-fetch tickets (1 query instead of N) for scalability
    const ticketIds = [...new Set(
      recentCheckins.documents.map((d) => d.ticketId as string).filter(Boolean),
    )];
    const ticketMap = new Map<string, { ticketCode: string; attendeeName: string; tierName: string; tierId: string; ownerId: string }>();
    if (ticketIds.length > 0) {
      try {
        const ticketDocs = await databases.listDocuments(DATABASE_ID, COLLECTIONS.TICKETS, [
          Query.equal("$id", ticketIds),
          Query.limit(ticketIds.length),
        ]);
        for (const t of ticketDocs.documents) {
          ticketMap.set(t.$id, {
            ticketCode: (t.ticketCode as string) || "",
            attendeeName: (t.attendeeName as string) || "",
            tierName: (t.tierName as string) || "",
            tierId: (t.tierId as string) || "",
            ownerId: (t.ownerId as string) || "",
          });
        }
      } catch { /* ticket batch fetch optional */ }
    }

    // Batch-fetch tier names when tickets don't have tierName inline
    const tierIds = [...new Set(
      [...ticketMap.values()].filter((t) => !t.tierName && t.tierId).map((t) => t.tierId),
    )];
    const tierNameMap = new Map<string, string>();
    if (tierIds.length > 0) {
      try {
        const tierDocs = await databases.listDocuments(DATABASE_ID, COLLECTIONS.TICKET_TIERS, [
          Query.equal("$id", tierIds),
          Query.limit(tierIds.length),
        ]);
        for (const tier of tierDocs.documents) {
          tierNameMap.set(tier.$id, (tier.name as string) || "");
        }
      } catch { /* tier batch fetch optional */ }
    }

    // Batch-fetch profiles for photo URLs + display names (1 query instead of N)
    const ownerIds = [...new Set(
      [...ticketMap.values()].map((t) => t.ownerId).filter(Boolean),
    )];
    const profileMap = new Map<string, { photoUrl: string; displayName: string }>();
    if (ownerIds.length > 0) {
      try {
        const profileDocs = await databases.listDocuments(DATABASE_ID, COLLECTIONS.PROFILES, [
          Query.equal("userId", ownerIds),
          Query.limit(ownerIds.length),
        ]);
        for (const p of profileDocs.documents) {
          profileMap.set(p.userId as string, {
            photoUrl: (p.photoUrl as string) || "",
            displayName: (p.displayName as string) || "",
          });
        }
      } catch { /* profile batch fetch optional */ }
    }

    // Assemble feed entries from pre-fetched data (no per-entry queries)
    const feed = recentCheckins.documents.map((doc) => {
      const ticket = ticketMap.get(doc.ticketId as string);
      const profile = ticket?.ownerId ? profileMap.get(ticket.ownerId) : undefined;
      const gate = gates.documents.find((g) => g.$id === doc.gateId);
      // Fallback chains: ticket field → lookup table → empty
      const name = ticket?.attendeeName || profile?.displayName || "";
      const tier = ticket?.tierName || (ticket?.tierId ? tierNameMap.get(ticket.tierId) : "") || "";
      return {
        id: doc.$id,
        ticketCode: ticket?.ticketCode ?? "",
        attendeeName: name,
        tierName: tier,
        attendeePhotoUrl: profile?.photoUrl || null,
        gateName: (gate?.name as string) || "Unknown",
        status: doc.status === "confirmed" ? "valid" : doc.status === "conflicted" ? "duplicate" : "invalid",
        timestamp: doc.scannedAt as string,
      };
    });

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
