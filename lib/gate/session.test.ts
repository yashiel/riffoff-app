import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreateDocument = vi.hoisted(() => vi.fn());
const mockGetDocument = vi.hoisted(() => vi.fn());
const mockUpdateDocument = vi.hoisted(() => vi.fn());
const mockListDocuments = vi.hoisted(() => vi.fn());
const mockValidateFingerprint = vi.hoisted(() => vi.fn());
const mockEd25519Verify = vi.hoisted(() => vi.fn());

vi.mock("@/lib/appwrite/server", () => ({
  createAdminClient: vi.fn().mockResolvedValue({
    databases: {
      createDocument: mockCreateDocument,
      getDocument: mockGetDocument,
      updateDocument: mockUpdateDocument,
      listDocuments: mockListDocuments,
    },
  }),
}));

vi.mock("../crypto/device-fingerprint", () => ({
  validateFingerprint: mockValidateFingerprint,
}));

vi.mock("@/lib/crypto/ed25519", () => ({
  verify: mockEd25519Verify,
}));

/** Helper: mock a 'getDocument' call that asks for a specific collection */
function mockGetDocumentForCollection(
  collection: string,
  value: unknown | Error,
) {
  mockGetDocument.mockImplementationOnce(async (_db, col) => {
    if (col === collection) {
      if (value instanceof Error) throw value;
      return value;
    }
    throw new Error(`unexpected getDocument(${col})`);
  });
}

import {
  createSessionFromQR,
  createSessionFromPIN,
  validateSession,
  revokeSession,
  updateLastSeen,
} from "./session";

describe("session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const deviceId = "device-abc-123";
  const deviceFingerprint = "a".repeat(64);
  const fingerprint = {
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)",
    screenSize: "390x844",
    timezone: "Asia/Kuala_Lumpur",
    language: "en-MY",
  };

  describe("createSessionFromQR", () => {
    const validQRPayload = {
      eventId: "event-001",
      gateId: "gate-001",
      issuedBy: "user-admin-001",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      signature: "valid-sig",
      kid: "key-001",
    };

    it("valid QR payload creates session and returns session object", async () => {
      // 1. signing key lookup
      mockGetDocumentForCollection("signing-keys", {
        $id: "key-001",
        active: true,
        publicKey: "test-public-key",
      });
      // 2. ed25519 verifies as valid
      mockEd25519Verify.mockResolvedValueOnce(true);
      // 3. enforceDeviceLimit pre-check — gate doesn't exist (returns early)
      mockGetDocumentForCollection("gates", new Error("not found"));
      // 4. session creation
      mockCreateDocument.mockResolvedValueOnce({
        $id: "session-001",
        eventId: "event-001",
        gateId: "gate-001",
        deviceId,
        deviceFingerprint,
        issuedBy: "user-admin-001",
        status: "active",
        expiresAt: "2026-03-27T00:00:00.000Z",
        lastSeenAt: "2026-03-26T12:00:00.000Z",
      });
      // 5. enforceDeviceLimit post-create — gate still doesn't exist
      mockGetDocumentForCollection("gates", new Error("not found"));

      const session = await createSessionFromQR(
        validQRPayload,
        deviceId,
        deviceFingerprint,
      );

      expect(session.sessionId).toBe("session-001");
      expect(session.eventId).toBe("event-001");
      expect(session.gateId).toBe("gate-001");
      expect(session.status).toBe("active");
      expect(mockCreateDocument).toHaveBeenCalledOnce();
    });

    it("expired QR payload throws error", async () => {
      const expiredPayload = {
        ...validQRPayload,
        expiresAt: new Date(Date.now() - 60 * 1000).toISOString(),
      };

      await expect(
        createSessionFromQR(expiredPayload, deviceId, deviceFingerprint),
      ).rejects.toThrow("QR code has expired");

      expect(mockCreateDocument).not.toHaveBeenCalled();
    });

    it("invalid signature throws error", async () => {
      mockGetDocumentForCollection("signing-keys", {
        $id: "key-001",
        active: true,
        publicKey: "test-public-key",
      });
      mockEd25519Verify.mockResolvedValueOnce(false);

      await expect(
        createSessionFromQR(validQRPayload, deviceId, deviceFingerprint),
      ).rejects.toThrow("Invalid QR code signature");

      expect(mockCreateDocument).not.toHaveBeenCalled();
    });

    it("missing signature throws error", async () => {
      const unsignedPayload = {
        eventId: "event-001",
        gateId: "gate-001",
        issuedBy: "user-admin-001",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      };

      await expect(
        createSessionFromQR(unsignedPayload, deviceId, deviceFingerprint),
      ).rejects.toThrow(/missing cryptographic signature/);

      expect(mockCreateDocument).not.toHaveBeenCalled();
    });
  });

  describe("createSessionFromPIN", () => {
    it("valid PIN creates session and returns session object", async () => {
      // PIN lookup
      mockListDocuments.mockResolvedValueOnce({
        total: 1,
        documents: [
          {
            $id: "pin-001",
            pin: "123456",
            gateId: "gate-001",
            eventId: "event-001",
            issuedBy: "user-admin-001",
            usedCount: 0,
            expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          },
        ],
      });
      // Pre-check enforceDeviceLimit — gate not configured, returns early
      mockGetDocumentForCollection("gates", new Error("not found"));
      // Session creation
      mockCreateDocument.mockResolvedValueOnce({
        $id: "session-002",
        eventId: "event-001",
        gateId: "gate-001",
        deviceId,
        deviceFingerprint,
        issuedBy: "user-admin-001",
        status: "active",
        expiresAt: "2026-03-27T00:00:00.000Z",
        lastSeenAt: "2026-03-26T12:00:00.000Z",
      });
      // Post-create enforceDeviceLimit — gate still not configured
      mockGetDocumentForCollection("gates", new Error("not found"));

      const session = await createSessionFromPIN(
        "123456",
        "gate-001",
        deviceId,
        deviceFingerprint,
      );

      expect(session.sessionId).toBe("session-002");
      expect(session.eventId).toBe("event-001");
      expect(session.gateId).toBe("gate-001");
      expect(mockUpdateDocument).toHaveBeenCalledWith(
        "riffoff",
        "gate-access-pins",
        "pin-001",
        { usedCount: 1 },
      );
    });

    it("invalid PIN throws a generic error (no enumeration)", async () => {
      mockListDocuments.mockResolvedValueOnce({ total: 0, documents: [] });

      // The implementation deliberately returns the same error for both
      // invalid and expired PINs to prevent attackers from probing valid
      // PIN values.
      await expect(
        createSessionFromPIN(
          "wrong-pin",
          "gate-001",
          deviceId,
          deviceFingerprint,
        ),
      ).rejects.toThrow(/Invalid or expired PIN/);
    });

    it("expired PIN also throws the generic error (no enumeration)", async () => {
      // Expired PINs are filtered out by the query (`Query.greaterThan
      // expiresAt now`), so the listDocuments call returns total=0
      // for an expired PIN.
      mockListDocuments.mockResolvedValueOnce({ total: 0, documents: [] });

      await expect(
        createSessionFromPIN(
          "654321",
          "gate-001",
          deviceId,
          deviceFingerprint,
        ),
      ).rejects.toThrow(/Invalid or expired PIN/);
    });
  });

  describe("validateSession", () => {
    const activeSession = {
      $id: "session-001",
      eventId: "event-001",
      gateId: "gate-001",
      deviceId,
      deviceFingerprint,
      issuedBy: "user-admin-001",
      status: "active",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      lastSeenAt: new Date().toISOString(),
    };

    it("active session with matching fingerprint returns session", async () => {
      mockGetDocument.mockResolvedValue(activeSession);
      mockValidateFingerprint.mockReturnValue(true);

      const session = await validateSession("session-001", fingerprint);

      expect(session).not.toBeNull();
      expect(session!.sessionId).toBe("session-001");
      expect(session!.status).toBe("active");
    });

    it("expired session returns null", async () => {
      mockGetDocument.mockResolvedValue({
        ...activeSession,
        expiresAt: new Date(Date.now() - 60 * 1000).toISOString(),
      });

      const session = await validateSession("session-001", fingerprint);

      expect(session).toBeNull();
    });

    it("revoked session returns null", async () => {
      mockGetDocument.mockResolvedValue({
        ...activeSession,
        status: "revoked",
      });

      const session = await validateSession("session-001", fingerprint);

      expect(session).toBeNull();
    });

    it("fingerprint mismatch returns null", async () => {
      mockGetDocument.mockResolvedValue(activeSession);
      mockValidateFingerprint.mockReturnValue(false);

      const session = await validateSession("session-001", fingerprint);

      expect(session).toBeNull();
    });
  });

  describe("revokeSession", () => {
    it("updates status to revoked", async () => {
      mockUpdateDocument.mockResolvedValue({});

      await revokeSession("session-001");

      expect(mockUpdateDocument).toHaveBeenCalledWith(
        "riffoff",
        "gate-sessions",
        "session-001",
        { status: "revoked" },
      );
    });
  });

  describe("updateLastSeen", () => {
    it("updates lastSeenAt timestamp", async () => {
      mockUpdateDocument.mockResolvedValue({});

      await updateLastSeen("session-001");

      expect(mockUpdateDocument).toHaveBeenCalledWith(
        "riffoff",
        "gate-sessions",
        "session-001",
        expect.objectContaining({
          lastSeenAt: expect.stringMatching(
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
          ),
        }),
      );
    });
  });
});
