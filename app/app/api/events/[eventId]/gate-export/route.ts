import { NextRequest, NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { createAdminClient, createSessionClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";
import { isCurrentUserAdmin } from "@/lib/auth-utils";
import type { EventDoc } from "@/lib/appwrite/types";

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

    // Build gate name lookup
    const gates = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.GATES,
      [Query.equal("eventId", eventId), Query.limit(100)],
    );
    const gateNameMap = new Map<string, string>();
    for (const gate of gates.documents) {
      gateNameMap.set(gate.$id, gate.name);
    }

    // Fetch all check-ins (paginated to handle large events)
    const allCheckins: Array<Record<string, unknown>> = [];
    let offset = 0;
    const batchSize = 100;

    while (true) {
      const batch = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.GATE_CHECKINS,
        [
          Query.equal("eventId", eventId),
          Query.orderDesc("scannedAt"),
          Query.limit(batchSize),
          Query.offset(offset),
        ],
      );

      allCheckins.push(
        ...batch.documents.map((doc) => ({
          ticketId: doc.ticketId,
          gate: gateNameMap.get(doc.gateId as string) ?? doc.gateId,
          device: doc.deviceId,
          scannedAt: doc.scannedAt,
          syncedAt: doc.syncedAt ?? "",
          status: doc.status,
          offline: doc.offlineMode ? "yes" : "no",
        })),
      );

      if (batch.documents.length < batchSize) break;
      offset += batchSize;
    }

    // Build CSV
    const headers = ["ticket_code", "gate", "device", "scanned_at", "synced_at", "status", "offline"];
    const csvRows = [headers.join(",")];

    for (const checkin of allCheckins) {
      const row = [
        escapeCsvField(String(checkin.ticketId)),
        escapeCsvField(String(checkin.gate)),
        escapeCsvField(String(checkin.device)),
        escapeCsvField(String(checkin.scannedAt)),
        escapeCsvField(String(checkin.syncedAt)),
        escapeCsvField(String(checkin.status)),
        escapeCsvField(String(checkin.offline)),
      ];
      csvRows.push(row.join(","));
    }

    const csv = csvRows.join("\n");
    const filename = `gate-checkins-${eventId}-${new Date().toISOString().slice(0, 10)}.csv`;

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to export check-ins";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
