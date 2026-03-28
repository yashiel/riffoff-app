import { ID, Query, type Databases } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";
import { verify as verifyEd25519 } from "@/lib/crypto/ed25519";
import { validateFingerprint } from "../crypto/device-fingerprint";

export interface GateSession {
  sessionId: string;
  eventId: string;
  gateId: string;
  deviceId: string;
  deviceFingerprint: string;
  issuedBy: string;
  status: "active" | "revoked" | "expired";
  expiresAt: string;
  lastSeenAt: string;
}

/**
 * Create a gate session from a scanned QR code payload.
 * Validates expiry and cryptographic signature before creating the session.
 */
export async function createSessionFromQR(
  qrPayload: {
    eventId: string;
    gateId: string;
    issuedBy: string;
    issuedAt?: string;
    expiresAt: string;
    signature?: string;
    kid?: string;
  },
  deviceId: string,
  deviceFingerprint: string,
): Promise<GateSession> {
  const now = new Date();
  const expiresAt = new Date(qrPayload.expiresAt);

  if (expiresAt <= now) {
    throw new Error("QR code has expired");
  }

  const { databases } = await createAdminClient();

  // Verify Ed25519 signature against the signing key's public key
  if (!qrPayload.signature || !qrPayload.kid) {
    throw new Error("QR code missing cryptographic signature");
  }

  const signingKey = await databases.getDocument(
    DATABASE_ID,
    COLLECTIONS.SIGNING_KEYS,
    qrPayload.kid,
  );

  if (!signingKey.active) {
    throw new Error("Signing key has been revoked");
  }

  // Reconstruct the original payload that was signed
  const originalPayload = JSON.stringify({
    eventId: qrPayload.eventId,
    gateId: qrPayload.gateId,
    issuedBy: qrPayload.issuedBy,
    issuedAt: qrPayload.issuedAt,
    expiresAt: qrPayload.expiresAt,
  });

  const isValid = await verifyEd25519(
    originalPayload,
    qrPayload.signature,
    signingKey.publicKey,
  );

  if (!isValid) {
    throw new Error("Invalid QR code signature");
  }

  // Check device limit on the gate
  await enforceDeviceLimit(databases, qrPayload.eventId, qrPayload.gateId);

  const sessionExpiresAt = new Date(
    now.getTime() + 12 * 60 * 60 * 1000,
  ).toISOString();

  const doc = await databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.GATE_SESSIONS,
    ID.unique(),
    {
      eventId: qrPayload.eventId,
      gateId: qrPayload.gateId,
      deviceId,
      deviceFingerprint,
      issuedBy: qrPayload.issuedBy,
      status: "active",
      expiresAt: sessionExpiresAt,
      lastSeenAt: now.toISOString(),
    },
  );

  return {
    sessionId: doc.$id,
    eventId: doc.eventId,
    gateId: doc.gateId,
    deviceId: doc.deviceId,
    deviceFingerprint: doc.deviceFingerprint,
    issuedBy: doc.issuedBy,
    status: doc.status,
    expiresAt: doc.expiresAt,
    lastSeenAt: doc.lastSeenAt,
  };
}

/**
 * Create a gate session from an access PIN.
 * Looks up the PIN in the gate-access-pins collection, validates it,
 * increments the usage count, and creates a new session.
 */
export async function createSessionFromPIN(
  pin: string,
  gateId: string,
  deviceId: string,
  deviceFingerprint: string,
  deviceInfo?: { userAgent: string; screenSize: string; timezone: string; language: string },
): Promise<GateSession> {
  const { databases } = await createAdminClient();

  const now = new Date();

  // Build query - if gateId is "default" or empty, match any PIN for this code
  const pinQueries = [
    Query.equal("pin", pin),
    Query.greaterThan("expiresAt", now.toISOString()),
  ];
  // Only filter by gateId if a specific one was provided (not "default")
  if (gateId && gateId !== "default") {
    pinQueries.push(Query.equal("gateId", gateId));
  }

  const pinResults = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.GATE_ACCESS_PINS,
    pinQueries,
  );

  if (pinResults.total === 0) {
    // Return same generic error for expired and invalid PINs to prevent enumeration
    throw new Error("Invalid or expired PIN");
  }

  const pinDoc = pinResults.documents[0];

  // Enforce maximum usage limit (default 10 sessions per PIN)
  const maxUses = (pinDoc.maxUses as number) || 10;
  const currentUses = (pinDoc.usedCount as number) || 0;
  if (currentUses >= maxUses) {
    throw new Error("Invalid or expired PIN");
  }

  // Increment usedCount
  await databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.GATE_ACCESS_PINS,
    pinDoc.$id,
    { usedCount: currentUses + 1 },
  );

  // Use the actual gateId from PIN record (not the "default" sent by client)
  const resolvedGateId = (pinDoc.gateId as string) || gateId;

  // Check device limit on the gate
  await enforceDeviceLimit(databases, pinDoc.eventId as string, resolvedGateId);

  const sessionExpiresAt = new Date(
    now.getTime() + 12 * 60 * 60 * 1000,
  ).toISOString();

  const doc = await databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.GATE_SESSIONS,
    ID.unique(),
    {
      eventId: pinDoc.eventId,
      gateId: resolvedGateId,
      deviceId,
      deviceFingerprint,
      issuedBy: pinDoc.issuedBy || "pin-auth",
      status: "active",
      expiresAt: sessionExpiresAt,
      lastSeenAt: now.toISOString(),
      ...(deviceInfo ? {
        userAgent: deviceInfo.userAgent.slice(0, 512),
        screenSize: deviceInfo.screenSize,
        timezone: deviceInfo.timezone,
        language: deviceInfo.language,
      } : {}),
    },
  );

  return {
    sessionId: doc.$id,
    eventId: doc.eventId,
    gateId: doc.gateId,
    deviceId: doc.deviceId,
    deviceFingerprint: doc.deviceFingerprint,
    issuedBy: doc.issuedBy,
    status: doc.status,
    expiresAt: doc.expiresAt,
    lastSeenAt: doc.lastSeenAt,
  };
}

/**
 * Validate an existing gate session.
 * Checks status, expiry, and device fingerprint match.
 * Returns the session if valid, null otherwise.
 */
export async function validateSession(
  sessionId: string,
  fingerprint: {
    userAgent: string;
    screenSize: string;
    timezone: string;
    language: string;
  },
): Promise<GateSession | null> {
  const { databases } = await createAdminClient();

  let doc;
  try {
    doc = await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.GATE_SESSIONS,
      sessionId,
    );
  } catch {
    return null;
  }

  if (doc.status !== "active") {
    return null;
  }

  const now = new Date();
  if (new Date(doc.expiresAt) <= now) {
    return null;
  }

  const fingerprintValid = validateFingerprint(
    doc.deviceFingerprint,
    fingerprint.userAgent,
    fingerprint.screenSize,
    fingerprint.timezone,
    fingerprint.language,
  );

  if (!fingerprintValid) {
    return null;
  }

  return {
    sessionId: doc.$id,
    eventId: doc.eventId,
    gateId: doc.gateId,
    deviceId: doc.deviceId,
    deviceFingerprint: doc.deviceFingerprint,
    issuedBy: doc.issuedBy,
    status: doc.status,
    expiresAt: doc.expiresAt,
    lastSeenAt: doc.lastSeenAt,
  };
}

/**
 * Revoke a gate session by setting its status to "revoked".
 */
export async function revokeSession(sessionId: string): Promise<void> {
  const { databases } = await createAdminClient();

  await databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.GATE_SESSIONS,
    sessionId,
    { status: "revoked" },
  );
}

/**
 * Update the lastSeenAt timestamp on a gate session.
 */
export async function updateLastSeen(sessionId: string): Promise<void> {
  const { databases } = await createAdminClient();

  await databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.GATE_SESSIONS,
    sessionId,
    { lastSeenAt: new Date().toISOString() },
  );
}

/**
 * Enforce device limit for a gate.
 * maxDevices = 0 means unlimited (no restriction).
 * Throws if adding a new device would exceed the gate's maxDevices limit.
 */
async function enforceDeviceLimit(
  databases: Databases,
  eventId: string,
  gateId: string,
): Promise<void> {
  // Fetch the gate to check maxDevices
  let gate;
  try {
    gate = await databases.getDocument(DATABASE_ID, COLLECTIONS.GATES, gateId);
  } catch {
    // Gate doesn't exist or is default — skip enforcement
    return;
  }

  const maxDevices = (gate.maxDevices as number) ?? 0;

  // 0 = unlimited — no restriction
  if (maxDevices <= 0) return;

  // Count active sessions for this gate
  const activeSessions = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.GATE_SESSIONS,
    [
      Query.equal("eventId", eventId),
      Query.equal("gateId", gateId),
      Query.equal("status", "active"),
      Query.limit(maxDevices + 1),
    ],
  );

  if (activeSessions.total >= maxDevices) {
    throw new Error(
      `Device limit reached. This gate allows a maximum of ${maxDevices} device${maxDevices !== 1 ? "s" : ""}.`,
    );
  }
}
