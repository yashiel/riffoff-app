import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";

export type CheckInStatus =
  | "confirmed"
  | "already_checked_in"
  | "conflicted"
  | "rejected";

export interface CheckInResult {
  status: CheckInStatus;
  reason?: string;
  checkinId?: string;
  conflictWith?: string;
}

export interface CheckInInput {
  ticketId: string;
  eventId: string;
  gateId: string;
  sessionId: string;
  deviceId: string;
  scannedAt: string;
  offlineMode: boolean;
}

export async function processCheckIn(
  input: CheckInInput,
): Promise<CheckInResult> {
  const { databases } = await createAdminClient();

  // 1. Get ticket
  let ticket;
  try {
    ticket = await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.TICKETS,
      input.ticketId,
    );
  } catch {
    return { status: "rejected", reason: "Ticket not found" };
  }

  // 2. Check event matches
  if (ticket.eventId !== input.eventId) {
    return { status: "rejected", reason: "Wrong event" };
  }

  // 3. Check ticket status
  if (ticket.status === "void") {
    return { status: "rejected", reason: "Ticket is void" };
  }
  if (ticket.status === "refunded") {
    return { status: "rejected", reason: "Ticket is refunded" };
  }

  // 4. Check if already checked in
  if (ticket.checkedInAt) {
    return { status: "already_checked_in" };
  }

  // 5. Create gate-checkin document with deterministic ID to prevent race conditions.
  //    If two requests race, the second createDocument will fail with a conflict (409).
  //    Appwrite IDs max 36 chars — use a hash of ticket+event to stay within limits.
  const crypto = await import("crypto");
  const checkinId = crypto.createHash("sha256")
    .update(`${input.ticketId}:${input.eventId}`)
    .digest("hex")
    .slice(0, 36);
  try {
    await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.GATE_CHECKINS,
      checkinId,
      {
        ticketId: input.ticketId,
        eventId: input.eventId,
        gateId: input.gateId,
        sessionId: input.sessionId,
        deviceId: input.deviceId,
        scannedAt: input.scannedAt,
        offlineMode: input.offlineMode,
        status: "confirmed",
      },
    );
  } catch (err) {
    // Conflict (409) means another request already checked in this ticket
    const message = err instanceof Error ? err.message : "";
    if (message.includes("already exists") || message.includes("Conflict")) {
      return { status: "already_checked_in" };
    }
    throw err;
  }

  // 6. Update ticket with check-in info
  await databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.TICKETS,
    input.ticketId,
    {
      checkedInAt: input.scannedAt,
      checkedInBy: input.deviceId,
    },
  );

  return { status: "confirmed", checkinId };
}

export async function processBatchSync(
  inputs: CheckInInput[],
): Promise<CheckInResult[]> {
  const results: CheckInResult[] = [];
  const { databases } = await createAdminClient();

  for (const input of inputs) {
    // For offline sync, check for conflicts first
    if (input.offlineMode) {
      // Query existing check-ins for this ticket
      const existing = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.GATE_CHECKINS,
        [
          Query.equal("ticketId", input.ticketId),
          Query.equal("status", "confirmed"),
        ],
      );

      if (
        existing.total > 0 &&
        existing.documents[0].deviceId !== input.deviceId
      ) {
        // Conflict: different device already checked in this ticket
        const conflictCheckinId = ID.unique();
        await databases.createDocument(
          DATABASE_ID,
          COLLECTIONS.GATE_CHECKINS,
          conflictCheckinId,
          {
            ticketId: input.ticketId,
            eventId: input.eventId,
            gateId: input.gateId,
            sessionId: input.sessionId,
            deviceId: input.deviceId,
            scannedAt: input.scannedAt,
            offlineMode: input.offlineMode,
            status: "conflicted",
            conflictWith: existing.documents[0].$id,
          },
        );

        results.push({
          status: "conflicted",
          checkinId: conflictCheckinId,
          conflictWith: existing.documents[0].$id,
        });
        continue;
      }
    }

    const result = await processCheckIn(input);
    results.push(result);
  }

  return results;
}
