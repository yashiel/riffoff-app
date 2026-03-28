import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreateDocument = vi.hoisted(() => vi.fn());
const mockGetDocument = vi.hoisted(() => vi.fn());
const mockUpdateDocument = vi.hoisted(() => vi.fn());
const mockListDocuments = vi.hoisted(() => vi.fn());
const mockValidateFingerprint = vi.hoisted(() => vi.fn());

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
    };

    it("valid QR payload creates session and returns session object", async () => {
      mockCreateDocument.mockResolvedValue({
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
      const invalidSigPayload = {
        ...validQRPayload,
        signature: "invalid",
      };

      await expect(
        createSessionFromQR(invalidSigPayload, deviceId, deviceFingerprint),
      ).rejects.toThrow("Invalid QR code signature");

      expect(mockCreateDocument).not.toHaveBeenCalled();
    });
  });

  describe("createSessionFromPIN", () => {
    it("valid PIN creates session and returns session object", async () => {
      mockListDocuments.mockResolvedValue({
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

      mockCreateDocument.mockResolvedValue({
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

    it("invalid PIN throws error", async () => {
      // First call (with expiry filter) returns nothing
      mockListDocuments.mockResolvedValueOnce({ total: 0, documents: [] });
      // Second call (without expiry filter) also returns nothing
      mockListDocuments.mockResolvedValueOnce({ total: 0, documents: [] });

      await expect(
        createSessionFromPIN(
          "wrong-pin",
          "gate-001",
          deviceId,
          deviceFingerprint,
        ),
      ).rejects.toThrow("Invalid PIN");
    });

    it("expired PIN throws error", async () => {
      // First call (with expiry filter) returns nothing
      mockListDocuments.mockResolvedValueOnce({ total: 0, documents: [] });
      // Second call (without expiry filter) finds the expired PIN
      mockListDocuments.mockResolvedValueOnce({
        total: 1,
        documents: [
          {
            $id: "pin-expired",
            pin: "654321",
            gateId: "gate-001",
            eventId: "event-001",
            expiresAt: new Date(Date.now() - 60 * 1000).toISOString(),
          },
        ],
      });

      await expect(
        createSessionFromPIN(
          "654321",
          "gate-001",
          deviceId,
          deviceFingerprint,
        ),
      ).rejects.toThrow("PIN has expired");
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
