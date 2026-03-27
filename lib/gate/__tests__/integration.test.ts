import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";

// ---------------------------------------------------------------------------
// Mocks — Appwrite
// ---------------------------------------------------------------------------

const mockCreateDocument = vi.fn();
const mockGetDocument = vi.fn();
const mockUpdateDocument = vi.fn();
const mockListDocuments = vi.fn();

vi.mock("@/lib/appwrite/server", () => ({
  createAdminClient: vi.fn().mockResolvedValue({
    databases: {
      createDocument: (...args: unknown[]) => mockCreateDocument(...args),
      getDocument: (...args: unknown[]) => mockGetDocument(...args),
      updateDocument: (...args: unknown[]) => mockUpdateDocument(...args),
      listDocuments: (...args: unknown[]) => mockListDocuments(...args),
    },
  }),
  createSessionClient: vi.fn().mockResolvedValue({
    account: {
      get: vi.fn().mockResolvedValue({ $id: "user-123", name: "Test User" }),
    },
  }),
}));

vi.mock("@/lib/appwrite/config", () => ({
  DATABASE_ID: "test-db",
  COLLECTIONS: {
    GATES: "gates",
    GATE_SESSIONS: "gate-sessions",
    GATE_CHECKINS: "gate-checkins",
    SIGNING_KEYS: "signing-keys",
    GATE_ACCESS_PINS: "gate-access-pins",
    GATE_MESSAGES: "gate-messages",
    TICKETS: "tickets",
    EVENTS: "events",
    TICKET_TIERS: "tickettiers",
  },
}));

vi.mock("node-appwrite", async () => {
  const actual = await vi.importActual<typeof import("node-appwrite")>(
    "node-appwrite",
  );
  let idCounter = 0;
  return {
    ...actual,
    ID: {
      unique: vi.fn(() => `generated-id-${++idCounter}`),
    },
  };
});

// ---------------------------------------------------------------------------
// Imports — real modules under test
// ---------------------------------------------------------------------------

import { generateKeyPair, sign, verify } from "../../crypto/ed25519";
import {
  generateFingerprint,
  validateFingerprint,
} from "../../crypto/device-fingerprint";
import { createGateToken, verifyGateToken } from "../token";
import {
  buildManifest,
  hashTicket,
  type ManifestPublicKey,
  type GateConfig,
} from "../manifest";
import { BloomFilter } from "../bloom-filter";
import { validateSession } from "../session";
import { processCheckIn, processBatchSync } from "../conflicts";
import type { CheckInInput } from "../conflicts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCheckInInput(overrides: Partial<CheckInInput> = {}): CheckInInput {
  return {
    ticketId: "ticket-1",
    eventId: "event-1",
    gateId: "gate-1",
    sessionId: "session-1",
    deviceId: "device-1",
    scannedAt: "2026-03-26T10:00:00.000Z",
    offlineMode: false,
    ...overrides,
  };
}

const DEFAULT_GATE_CONFIG: GateConfig = {
  gateId: "gate-1",
  gateName: "Main Gate",
  lanes: 4,
};

// ---------------------------------------------------------------------------
// Flow 1: Ed25519 token lifecycle
// ---------------------------------------------------------------------------

describe("Flow 1: Ed25519 token lifecycle", () => {
  it("generates keypair, creates token, verifies token — returns valid payload", async () => {
    const { publicKey, privateKey } = await generateKeyPair();
    const kid = "key-001";

    const token = await createGateToken(
      { tid: "ticket-42", eid: "event-7", nonce: "abc123" },
      privateKey,
      kid,
      300, // 5 minutes
    );

    expect(token).toBeTruthy();
    expect(token.split(".")).toHaveLength(3);

    const keys = new Map<string, string>([[kid, publicKey]]);
    const payload = await verifyGateToken(token, keys);

    expect(payload).not.toBeNull();
    expect(payload!.tid).toBe("ticket-42");
    expect(payload!.eid).toBe("event-7");
    expect(payload!.nonce).toBe("abc123");
    expect(payload!.exp).toBeGreaterThan(payload!.iat);
  });

  it("rejects token after expiry", async () => {
    const { publicKey, privateKey } = await generateKeyPair();
    const kid = "key-002";

    // Create token with 1-second TTL
    const token = await createGateToken(
      { tid: "t1", eid: "e1", nonce: "n1" },
      privateKey,
      kid,
      1,
    );

    // Advance time by 2 seconds
    const originalNow = Date.now;
    Date.now = () => originalNow() + 2000;

    try {
      const keys = new Map<string, string>([[kid, publicKey]]);
      const payload = await verifyGateToken(token, keys);
      expect(payload).toBeNull();
    } finally {
      Date.now = originalNow;
    }
  });

  it("accepts token with rotated key still in grace period", async () => {
    const oldPair = await generateKeyPair();
    const newPair = await generateKeyPair();
    const oldKid = "key-old";
    const newKid = "key-new";

    // Token signed with old key
    const token = await createGateToken(
      { tid: "t1", eid: "e1", nonce: "n1" },
      oldPair.privateKey,
      oldKid,
      300,
    );

    // Both old and new keys present (grace period)
    const keys = new Map<string, string>([
      [oldKid, oldPair.publicKey],
      [newKid, newPair.publicKey],
    ]);

    const payload = await verifyGateToken(token, keys);
    expect(payload).not.toBeNull();
    expect(payload!.tid).toBe("t1");
  });

  it("rejects token when old key removed (past grace period)", async () => {
    const oldPair = await generateKeyPair();
    const newPair = await generateKeyPair();
    const oldKid = "key-old";
    const newKid = "key-new";

    // Token signed with old key
    const token = await createGateToken(
      { tid: "t1", eid: "e1", nonce: "n1" },
      oldPair.privateKey,
      oldKid,
      300,
    );

    // Only new key present (old removed)
    const keys = new Map<string, string>([[newKid, newPair.publicKey]]);

    const payload = await verifyGateToken(token, keys);
    expect(payload).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Flow 2: Manifest generation and lookup
// ---------------------------------------------------------------------------

describe("Flow 2: Manifest generation and lookup", () => {
  it("builds manifest with 100 tickets and all hashes present", () => {
    const tickets = Array.from({ length: 100 }, (_, i) => `ticket-${i}`);
    const publicKeys: ManifestPublicKey[] = [
      { kid: "k1", key: "pubkey-1", active: true },
    ];

    const manifest = buildManifest(
      tickets,
      "event-1",
      publicKeys,
      DEFAULT_GATE_CONFIG,
    );

    expect(manifest.ticketHashes).toBeDefined();
    expect(manifest.ticketHashes!.length).toBe(100);
    expect(manifest.bloomFilter).toBeUndefined();
    expect(manifest.totalTickets).toBe(100);
    expect(manifest.eventId).toBe("event-1");

    // Verify each ticket produces a matching hash
    for (let i = 0; i < 100; i++) {
      const expected = hashTicket(`ticket-${i}`, "event-1", manifest.salt);
      expect(manifest.ticketHashes).toContain(expected);
    }
  });

  it("finds existing ticket hash in manifest", () => {
    const tickets = ["t-abc", "t-def", "t-ghi"];
    const manifest = buildManifest(
      tickets,
      "event-2",
      [{ kid: "k1", key: "pk1", active: true }],
      DEFAULT_GATE_CONFIG,
    );

    const hash = hashTicket("t-def", "event-2", manifest.salt);
    expect(manifest.ticketHashes!.includes(hash)).toBe(true);
  });

  it("does not find non-existent ticket hash", () => {
    const tickets = ["t-abc", "t-def"];
    const manifest = buildManifest(
      tickets,
      "event-3",
      [{ kid: "k1", key: "pk1", active: true }],
      DEFAULT_GATE_CONFIG,
    );

    const hash = hashTicket("t-nonexistent", "event-3", manifest.salt);
    expect(manifest.ticketHashes!.includes(hash)).toBe(false);
  });

  it("uses bloom filter when forceBloom is true", () => {
    const tickets = ["t-1", "t-2", "t-3"];
    const manifest = buildManifest(
      tickets,
      "event-4",
      [{ kid: "k1", key: "pk1", active: true }],
      DEFAULT_GATE_CONFIG,
      true, // forceBloom
    );

    expect(manifest.bloomFilter).toBeDefined();
    expect(manifest.ticketHashes).toBeUndefined();

    // Deserialize bloom and verify lookups
    const bf = BloomFilter.deserialize(manifest.bloomFilter!);
    for (const tid of tickets) {
      const h = hashTicket(tid, "event-4", manifest.salt);
      expect(bf.has(h)).toBe(true);
    }

    // Non-existent ticket should (almost certainly) not be found
    const missing = hashTicket("t-missing", "event-4", manifest.salt);
    // With only 3 items and 0.01% FPR, false positive is extremely unlikely
    expect(bf.has(missing)).toBe(false);
  });

  it("integrity hash matches content", () => {
    const manifest = buildManifest(
      ["t-1"],
      "event-5",
      [{ kid: "k1", key: "pk1", active: true }],
      DEFAULT_GATE_CONFIG,
    );

    // Reconstruct body without integrity
    const { integrity, ...body } = manifest;
    const expected = crypto
      .createHash("sha256")
      .update(JSON.stringify(body))
      .digest("hex");

    expect(integrity).toBe(expected);
  });
});

// ---------------------------------------------------------------------------
// Flow 3: Check-in with conflict detection
// ---------------------------------------------------------------------------

describe("Flow 3: Check-in with conflict detection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("first check-in returns confirmed", async () => {
    mockGetDocument.mockResolvedValueOnce({
      $id: "ticket-1",
      eventId: "event-1",
      status: "active",
      checkedInAt: null,
    });

    mockCreateDocument.mockResolvedValueOnce({ $id: "generated-id-checkin" });
    mockUpdateDocument.mockResolvedValueOnce({});

    const result = await processCheckIn(makeCheckInInput());

    expect(result.status).toBe("confirmed");
    expect(result.checkinId).toBeDefined();
  });

  it("same ticket, same device returns already_checked_in", async () => {
    mockGetDocument.mockResolvedValueOnce({
      $id: "ticket-1",
      eventId: "event-1",
      status: "active",
      checkedInAt: "2026-03-26T09:00:00.000Z",
    });

    const result = await processCheckIn(makeCheckInInput());

    expect(result.status).toBe("already_checked_in");
  });

  it("same ticket, different device (offline sync) returns conflicted", async () => {
    // For batch sync with offlineMode, listDocuments returns existing check-in from different device
    mockListDocuments.mockResolvedValueOnce({
      total: 1,
      documents: [
        {
          $id: "existing-checkin-id",
          ticketId: "ticket-1",
          deviceId: "device-1",
          status: "confirmed",
        },
      ],
    });

    mockCreateDocument.mockResolvedValueOnce({ $id: "conflict-checkin-id" });

    const inputs = [
      makeCheckInInput({
        deviceId: "device-2",
        offlineMode: true,
      }),
    ];

    const results = await processBatchSync(inputs);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("conflicted");
    expect(results[0].conflictWith).toBe("existing-checkin-id");
  });

  it("void ticket returns rejected", async () => {
    mockGetDocument.mockResolvedValueOnce({
      $id: "ticket-1",
      eventId: "event-1",
      status: "void",
      checkedInAt: null,
    });

    const result = await processCheckIn(makeCheckInInput());

    expect(result.status).toBe("rejected");
    expect(result.reason).toBe("Ticket is void");
  });

  it("wrong event ticket returns rejected", async () => {
    mockGetDocument.mockResolvedValueOnce({
      $id: "ticket-1",
      eventId: "event-999",
      status: "active",
      checkedInAt: null,
    });

    const result = await processCheckIn(makeCheckInInput({ eventId: "event-1" }));

    expect(result.status).toBe("rejected");
    expect(result.reason).toBe("Wrong event");
  });
});

// ---------------------------------------------------------------------------
// Flow 4: Batch sync
// ---------------------------------------------------------------------------

describe("Flow 4: Batch sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("batch of 5 check-ins (3 valid, 1 duplicate, 1 void) returns correct statuses", async () => {
    // All are offlineMode: true so batch sync path is used

    // Input 1: valid — no existing check-in, ticket is active
    mockListDocuments.mockResolvedValueOnce({ total: 0, documents: [] });
    mockGetDocument.mockResolvedValueOnce({
      $id: "ticket-1",
      eventId: "event-1",
      status: "active",
      checkedInAt: null,
    });
    mockCreateDocument.mockResolvedValueOnce({ $id: "ci-1" });
    mockUpdateDocument.mockResolvedValueOnce({});

    // Input 2: valid — no existing check-in, ticket is active
    mockListDocuments.mockResolvedValueOnce({ total: 0, documents: [] });
    mockGetDocument.mockResolvedValueOnce({
      $id: "ticket-2",
      eventId: "event-1",
      status: "active",
      checkedInAt: null,
    });
    mockCreateDocument.mockResolvedValueOnce({ $id: "ci-2" });
    mockUpdateDocument.mockResolvedValueOnce({});

    // Input 3: valid — no existing check-in, ticket is active
    mockListDocuments.mockResolvedValueOnce({ total: 0, documents: [] });
    mockGetDocument.mockResolvedValueOnce({
      $id: "ticket-3",
      eventId: "event-1",
      status: "active",
      checkedInAt: null,
    });
    mockCreateDocument.mockResolvedValueOnce({ $id: "ci-3" });
    mockUpdateDocument.mockResolvedValueOnce({});

    // Input 4: duplicate — no conflict from other device, but ticket already checked in
    mockListDocuments.mockResolvedValueOnce({ total: 0, documents: [] });
    mockGetDocument.mockResolvedValueOnce({
      $id: "ticket-4",
      eventId: "event-1",
      status: "active",
      checkedInAt: "2026-03-26T09:00:00.000Z",
    });

    // Input 5: void ticket — no conflict from other device, but ticket is void
    mockListDocuments.mockResolvedValueOnce({ total: 0, documents: [] });
    mockGetDocument.mockResolvedValueOnce({
      $id: "ticket-5",
      eventId: "event-1",
      status: "void",
      checkedInAt: null,
    });

    const inputs: CheckInInput[] = [
      makeCheckInInput({ ticketId: "ticket-1", offlineMode: true }),
      makeCheckInInput({ ticketId: "ticket-2", offlineMode: true }),
      makeCheckInInput({ ticketId: "ticket-3", offlineMode: true }),
      makeCheckInInput({ ticketId: "ticket-4", offlineMode: true }),
      makeCheckInInput({ ticketId: "ticket-5", offlineMode: true }),
    ];

    const results = await processBatchSync(inputs);

    expect(results).toHaveLength(5);
    expect(results[0].status).toBe("confirmed");
    expect(results[1].status).toBe("confirmed");
    expect(results[2].status).toBe("confirmed");
    expect(results[3].status).toBe("already_checked_in");
    expect(results[4].status).toBe("rejected");
  });

  it("empty batch returns empty array", async () => {
    const results = await processBatchSync([]);
    expect(results).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Flow 5: Session validation
// ---------------------------------------------------------------------------

describe("Flow 5: Session validation", () => {
  const DEVICE_CHARS = {
    userAgent: "Mozilla/5.0 Scanner",
    screenSize: "1920x1080",
    timezone: "Asia/Kuala_Lumpur",
    language: "en-US",
  };

  const storedFingerprint = generateFingerprint(
    DEVICE_CHARS.userAgent,
    DEVICE_CHARS.screenSize,
    DEVICE_CHARS.timezone,
    DEVICE_CHARS.language,
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("valid session + matching fingerprint returns session", async () => {
    const futureDate = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    mockGetDocument.mockResolvedValueOnce({
      $id: "session-1",
      eventId: "event-1",
      gateId: "gate-1",
      deviceId: "device-1",
      deviceFingerprint: storedFingerprint,
      issuedBy: "user-123",
      status: "active",
      expiresAt: futureDate,
      lastSeenAt: new Date().toISOString(),
    });

    const session = await validateSession("session-1", DEVICE_CHARS);

    expect(session).not.toBeNull();
    expect(session!.sessionId).toBe("session-1");
    expect(session!.status).toBe("active");
  });

  it("valid session + wrong fingerprint returns null", async () => {
    const futureDate = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    mockGetDocument.mockResolvedValueOnce({
      $id: "session-1",
      eventId: "event-1",
      gateId: "gate-1",
      deviceId: "device-1",
      deviceFingerprint: storedFingerprint,
      issuedBy: "user-123",
      status: "active",
      expiresAt: futureDate,
      lastSeenAt: new Date().toISOString(),
    });

    const wrongChars = {
      ...DEVICE_CHARS,
      userAgent: "DifferentBrowser/1.0",
    };

    const session = await validateSession("session-1", wrongChars);
    expect(session).toBeNull();
  });

  it("expired session returns null", async () => {
    const pastDate = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    mockGetDocument.mockResolvedValueOnce({
      $id: "session-1",
      eventId: "event-1",
      gateId: "gate-1",
      deviceId: "device-1",
      deviceFingerprint: storedFingerprint,
      issuedBy: "user-123",
      status: "active",
      expiresAt: pastDate,
      lastSeenAt: new Date().toISOString(),
    });

    const session = await validateSession("session-1", DEVICE_CHARS);
    expect(session).toBeNull();
  });

  it("revoked session returns null", async () => {
    const futureDate = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    mockGetDocument.mockResolvedValueOnce({
      $id: "session-1",
      eventId: "event-1",
      gateId: "gate-1",
      deviceId: "device-1",
      deviceFingerprint: storedFingerprint,
      issuedBy: "user-123",
      status: "revoked",
      expiresAt: futureDate,
      lastSeenAt: new Date().toISOString(),
    });

    const session = await validateSession("session-1", DEVICE_CHARS);
    expect(session).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Flow 6: Device fingerprint
// ---------------------------------------------------------------------------

describe("Flow 6: Device fingerprint", () => {
  const CHARS_A = {
    userAgent: "Mozilla/5.0 Scanner",
    screenSize: "1920x1080",
    timezone: "Asia/Kuala_Lumpur",
    language: "en-US",
  };

  const CHARS_B = {
    userAgent: "OtherBrowser/2.0",
    screenSize: "1366x768",
    timezone: "America/New_York",
    language: "fr-FR",
  };

  it("same device characteristics produce same fingerprint", () => {
    const fp1 = generateFingerprint(
      CHARS_A.userAgent,
      CHARS_A.screenSize,
      CHARS_A.timezone,
      CHARS_A.language,
    );
    const fp2 = generateFingerprint(
      CHARS_A.userAgent,
      CHARS_A.screenSize,
      CHARS_A.timezone,
      CHARS_A.language,
    );

    expect(fp1).toBe(fp2);
    expect(fp1).toHaveLength(64); // SHA256 hex
  });

  it("different device produces different fingerprint", () => {
    const fp1 = generateFingerprint(
      CHARS_A.userAgent,
      CHARS_A.screenSize,
      CHARS_A.timezone,
      CHARS_A.language,
    );
    const fp2 = generateFingerprint(
      CHARS_B.userAgent,
      CHARS_B.screenSize,
      CHARS_B.timezone,
      CHARS_B.language,
    );

    expect(fp1).not.toBe(fp2);
  });

  it("validates matching fingerprint", () => {
    const stored = generateFingerprint(
      CHARS_A.userAgent,
      CHARS_A.screenSize,
      CHARS_A.timezone,
      CHARS_A.language,
    );

    expect(
      validateFingerprint(
        stored,
        CHARS_A.userAgent,
        CHARS_A.screenSize,
        CHARS_A.timezone,
        CHARS_A.language,
      ),
    ).toBe(true);
  });

  it("rejects mismatched fingerprint", () => {
    const stored = generateFingerprint(
      CHARS_A.userAgent,
      CHARS_A.screenSize,
      CHARS_A.timezone,
      CHARS_A.language,
    );

    expect(
      validateFingerprint(
        stored,
        CHARS_B.userAgent,
        CHARS_B.screenSize,
        CHARS_B.timezone,
        CHARS_B.language,
      ),
    ).toBe(false);
  });
});
