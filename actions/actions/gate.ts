"use server";

import crypto from "crypto";
import { ID, Query } from "node-appwrite";
import { revalidatePath } from "next/cache";
import { createAdminClient, createSessionClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";
import { isCurrentUserAdmin } from "@/lib/auth-utils";
import { revokeSession } from "@/lib/gate/session";
import { sign, generateKeyPair, encryptPrivateKey } from "@/lib/crypto/ed25519";
import type { EventDoc } from "@/lib/appwrite/types";

// ─── Auth Helpers ────────────────────────────────────────

async function getAuthenticatedUser() {
  const sessionClient = await createSessionClient();
  if (!sessionClient) {
    throw new Error("Not authenticated");
  }
  return sessionClient.account.get();
}

async function verifyEventAccess(eventId: string) {
  const user = await getAuthenticatedUser();
  const { databases } = await createAdminClient();

  const event = await databases.getDocument(
    DATABASE_ID,
    COLLECTIONS.EVENTS,
    eventId,
  ) as unknown as EventDoc;

  const isAdmin = await isCurrentUserAdmin();
  if (event.organiserId !== user.$id && !isAdmin) {
    throw new Error("Not authorized to manage this event");
  }

  return { user, databases, event };
}

// ─── Gate CRUD ───────────────────────────────────────────

export async function createGate(
  eventId: string,
  name: string,
  capacity?: number,
  maxDevices?: number,
) {
  const { databases } = await verifyEventAccess(eventId);

  // Get current gate count for sort order
  const existing = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.GATES,
    [Query.equal("eventId", eventId)],
  );

  const gate = await databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.GATES,
    ID.unique(),
    {
      eventId,
      name,
      capacity: capacity ?? 0,
      maxDevices: maxDevices ?? 0,
      sortOrder: existing.total,
      status: "open",
    },
  );

  revalidatePath(`/dashboard/events/${eventId}`);
  return JSON.parse(JSON.stringify(gate));
}

export async function listGates(eventId: string) {
  await verifyEventAccess(eventId);
  const { databases } = await createAdminClient();

  const result = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.GATES,
    [
      Query.equal("eventId", eventId),
      Query.orderAsc("sortOrder"),
      Query.limit(100),
    ],
  );

  return JSON.parse(JSON.stringify(result.documents));
}

export async function updateGate(
  eventId: string,
  gateId: string,
  data: { name?: string; status?: string; capacity?: number; maxDevices?: number },
) {
  const { databases } = await verifyEventAccess(eventId);

  // Verify gate belongs to this event
  const gate = await databases.getDocument(
    DATABASE_ID,
    COLLECTIONS.GATES,
    gateId,
  );
  if (gate.eventId !== eventId) {
    throw new Error("Gate does not belong to this event");
  }

  const updatePayload: Record<string, unknown> = {};
  if (data.name !== undefined) updatePayload.name = data.name;
  if (data.status !== undefined) updatePayload.status = data.status;
  if (data.capacity !== undefined) updatePayload.capacity = data.capacity;
  if (data.maxDevices !== undefined) updatePayload.maxDevices = data.maxDevices;

  const updated = await databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.GATES,
    gateId,
    updatePayload,
  );

  revalidatePath(`/dashboard/events/${eventId}`);
  return JSON.parse(JSON.stringify(updated));
}

export async function lockGate(eventId: string, gateId: string) {
  return updateGate(eventId, gateId, { status: "locked" });
}

export async function unlockGate(eventId: string, gateId: string) {
  return updateGate(eventId, gateId, { status: "open" });
}

// ─── Signing Key Management ──────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureSigningKey(databases: any) {
  const keysResult = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.SIGNING_KEYS,
    [Query.equal("active", true), Query.limit(1)],
  );

  if (keysResult.total > 0) {
    return keysResult.documents[0];
  }

  // Auto-create a new signing key pair
  const { publicKey, privateKey } = await generateKeyPair();
  const kek = process.env.GATE_KEK ?? process.env.NEXT_APPWRITE_KEY!;
  const encrypted = encryptPrivateKey(privateKey, kek);
  const validUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

  return databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.SIGNING_KEYS,
    ID.unique(),
    { publicKey, encryptedPrivateKey: encrypted, active: true, validUntil },
  );
}

// ─── Access Code Generation ──────────────────────────────

export async function generateAccessQR(eventId: string, gateId: string) {
  const { user, databases } = await verifyEventAccess(eventId);

  // Verify gate belongs to this event
  const gate = await databases.getDocument(
    DATABASE_ID,
    COLLECTIONS.GATES,
    gateId,
  );
  if (gate.eventId !== eventId) {
    throw new Error("Gate does not belong to this event");
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes

  // Create a PIN that doubles as the QR token (same auth flow, simpler)
  // This keeps QR data short (~50 chars) for reliable scanning
  const qrPin = crypto.randomInt(100000, 999999).toString();

  await databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.GATE_ACCESS_PINS,
    ID.unique(),
    {
      eventId,
      pin: qrPin,
      gateId,
      createdBy: user.$id,
      expiresAt: expiresAt.toISOString(),
      usedCount: 0,
      maxUses: 1, // QR codes are single-use
    },
  );

  // Ultra-compact QR: just "RO:PIN" (9 chars = Version 1 QR = instant scan)
  const qrData = `RO:${qrPin}`;

  return { qrData, expiresAt: expiresAt.toISOString() };
}

export async function generateAccessPIN(eventId: string, gateId?: string) {
  const { user, databases } = await verifyEventAccess(eventId);

  // If gateId provided, verify it belongs to this event
  if (gateId) {
    const gate = await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.GATES,
      gateId,
    );
    if (gate.eventId !== eventId) {
      throw new Error("Gate does not belong to this event");
    }
  }

  // Generate random 6-digit PIN
  const pin = crypto.randomInt(100000, 999999).toString();

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes

  await databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.GATE_ACCESS_PINS,
    ID.unique(),
    {
      eventId,
      pin,
      gateId: gateId ?? "",
      createdBy: user.$id,
      expiresAt: expiresAt.toISOString(),
      usedCount: 0,
      maxUses: 50,
    },
  );

  return { pin, expiresAt: expiresAt.toISOString() };
}

// ─── Session Management ──────────────────────────────────

export async function listActiveSessions(eventId: string) {
  await verifyEventAccess(eventId);
  const { databases } = await createAdminClient();

  const result = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.GATE_SESSIONS,
    [
      Query.equal("eventId", eventId),
      Query.equal("status", "active"),
      Query.orderDesc("lastSeenAt"),
      Query.limit(100),
    ],
  );

  // Auto-revoke stale sessions (no heartbeat for > 2 minutes)
  const staleCutoff = Date.now() - 2 * 60 * 1000;
  const active = [];
  for (const doc of result.documents) {
    const lastSeen = doc.lastSeenAt ? new Date(doc.lastSeenAt as string).getTime() : 0;
    if (lastSeen < staleCutoff) {
      // Revoke in background — don't await to keep response fast
      databases.updateDocument(DATABASE_ID, COLLECTIONS.GATE_SESSIONS, doc.$id, { status: "revoked" }).catch(() => {});
    } else {
      active.push(doc);
    }
  }

  return JSON.parse(JSON.stringify(active));
}

export async function revokeGateSession(
  eventId: string,
  sessionId: string,
) {
  const { databases } = await verifyEventAccess(eventId);

  // Verify session belongs to this event
  const session = await databases.getDocument(
    DATABASE_ID,
    COLLECTIONS.GATE_SESSIONS,
    sessionId,
  );
  if (session.eventId !== eventId) {
    throw new Error("Session does not belong to this event");
  }

  await revokeSession(sessionId);
  revalidatePath(`/dashboard/events/${eventId}`);
}

/**
 * Revoke ALL active sessions for an event — emergency kill switch.
 */
export async function revokeAllSessions(eventId: string) {
  const { databases } = await verifyEventAccess(eventId);

  const result = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.GATE_SESSIONS,
    [
      Query.equal("eventId", eventId),
      Query.equal("status", "active"),
      Query.limit(100),
    ],
  );

  let revoked = 0;
  for (const session of result.documents) {
    await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.GATE_SESSIONS,
      session.$id,
      { status: "revoked" },
    );
    revoked++;
  }

  revalidatePath(`/dashboard/events/${eventId}`);
  return { revoked };
}

/**
 * Revoke all stale/disconnected sessions for an event.
 * A session is "stale" if lastSeenAt is older than the threshold (default 5 minutes).
 */
export async function revokeDisconnectedSessions(
  eventId: string,
  staleMinutes = 5,
) {
  const { databases } = await verifyEventAccess(eventId);

  const cutoff = new Date(Date.now() - staleMinutes * 60 * 1000).toISOString();

  const stale = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.GATE_SESSIONS,
    [
      Query.equal("eventId", eventId),
      Query.equal("status", "active"),
      Query.lessThan("lastSeenAt", cutoff),
      Query.limit(100),
    ],
  );

  let revoked = 0;
  for (const session of stale.documents) {
    await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.GATE_SESSIONS,
      session.$id,
      { status: "revoked" },
    );
    revoked++;
  }

  revalidatePath(`/dashboard/events/${eventId}`);
  return { revoked };
}

// ─── Messaging ───────────────────────────────────────────

export async function broadcastMessage(
  eventId: string,
  message: string,
  gateId?: string,
) {
  const { user, databases } = await verifyEventAccess(eventId);

  if (!message || message.trim().length === 0) {
    throw new Error("Message cannot be empty");
  }

  if (message.length > 2048) {
    throw new Error("Message exceeds maximum length of 2048 characters");
  }

  const doc = await databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.GATE_MESSAGES,
    ID.unique(),
    {
      eventId,
      gateId: gateId ?? "",
      message: message.trim(),
      createdBy: user.$id,
    },
  );

  return { success: true, messageId: doc.$id };
}
