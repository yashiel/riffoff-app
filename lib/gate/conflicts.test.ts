import { describe, it, expect, vi, beforeEach } from "vitest";
import { ID } from "node-appwrite";

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
}));

vi.mock("node-appwrite", async () => {
  const actual = await vi.importActual<typeof import("node-appwrite")>(
    "node-appwrite",
  );
  return {
    ...actual,
    ID: {
      unique: vi.fn(() => "generated-id"),
    },
  };
});

import { processCheckIn, processBatchSync } from "./conflicts";
import type { CheckInInput } from "./conflicts";

function makeInput(overrides: Partial<CheckInInput> = {}): CheckInInput {
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

describe("processCheckIn", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("confirms check-in for valid active ticket", async () => {
    mockGetDocument.mockResolvedValueOnce({
      $id: "ticket-1",
      eventId: "event-1",
      status: "active",
      checkedInAt: null,
    });
    mockCreateDocument.mockResolvedValueOnce({});
    mockUpdateDocument.mockResolvedValueOnce({});

    const result = await processCheckIn(makeInput());

    expect(result.status).toBe("confirmed");
    expect(result.checkinId).toBe("generated-id");

    // Verify gate-checkin doc created with status "confirmed"
    expect(mockCreateDocument).toHaveBeenCalledWith(
      "riffoff",
      "gate-checkins",
      "generated-id",
      expect.objectContaining({
        ticketId: "ticket-1",
        eventId: "event-1",
        status: "confirmed",
      }),
    );

    // Verify ticket updated with checkedInAt
    expect(mockUpdateDocument).toHaveBeenCalledWith(
      "riffoff",
      "tickets",
      "ticket-1",
      expect.objectContaining({
        checkedInAt: "2026-03-26T10:00:00.000Z",
        checkedInBy: "device-1",
      }),
    );
  });

  it("returns already_checked_in when ticket has checkedInAt", async () => {
    mockGetDocument.mockResolvedValueOnce({
      $id: "ticket-1",
      eventId: "event-1",
      status: "active",
      checkedInAt: "2026-03-26T09:00:00.000Z",
    });

    const result = await processCheckIn(makeInput());

    expect(result.status).toBe("already_checked_in");
    expect(mockCreateDocument).not.toHaveBeenCalled();
  });

  it("rejects void ticket", async () => {
    mockGetDocument.mockResolvedValueOnce({
      $id: "ticket-1",
      eventId: "event-1",
      status: "void",
      checkedInAt: null,
    });

    const result = await processCheckIn(makeInput());

    expect(result.status).toBe("rejected");
    expect(result.reason).toBe("Ticket is void");
  });

  it("rejects refunded ticket", async () => {
    mockGetDocument.mockResolvedValueOnce({
      $id: "ticket-1",
      eventId: "event-1",
      status: "refunded",
      checkedInAt: null,
    });

    const result = await processCheckIn(makeInput());

    expect(result.status).toBe("rejected");
    expect(result.reason).toBe("Ticket is refunded");
  });

  it("rejects when ticket not found", async () => {
    mockGetDocument.mockRejectedValueOnce(new Error("Document not found"));

    const result = await processCheckIn(makeInput());

    expect(result.status).toBe("rejected");
    expect(result.reason).toBe("Ticket not found");
  });

  it("rejects when event does not match", async () => {
    mockGetDocument.mockResolvedValueOnce({
      $id: "ticket-1",
      eventId: "event-999",
      status: "active",
      checkedInAt: null,
    });

    const result = await processCheckIn(makeInput({ eventId: "event-1" }));

    expect(result.status).toBe("rejected");
    expect(result.reason).toBe("Wrong event");
  });
});

describe("processBatchSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("processes array of check-ins and returns per-item results", async () => {
    // First ticket: valid
    mockGetDocument.mockResolvedValueOnce({
      $id: "ticket-1",
      eventId: "event-1",
      status: "active",
      checkedInAt: null,
    });
    mockListDocuments.mockResolvedValueOnce({ total: 0, documents: [] });
    mockCreateDocument.mockResolvedValueOnce({});
    mockUpdateDocument.mockResolvedValueOnce({});

    // Second ticket: already checked in
    mockGetDocument.mockResolvedValueOnce({
      $id: "ticket-2",
      eventId: "event-1",
      status: "active",
      checkedInAt: "2026-03-26T09:00:00.000Z",
    });
    mockListDocuments.mockResolvedValueOnce({ total: 0, documents: [] });

    const results = await processBatchSync([
      makeInput({ ticketId: "ticket-1", offlineMode: true }),
      makeInput({ ticketId: "ticket-2", offlineMode: true }),
    ]);

    expect(results).toHaveLength(2);
    expect(results[0].status).toBe("confirmed");
    expect(results[1].status).toBe("already_checked_in");
  });

  it("detects conflict when ticket checked in by different device", async () => {
    // Existing check-in from device-A
    mockListDocuments.mockResolvedValueOnce({
      total: 1,
      documents: [
        {
          $id: "existing-checkin-id",
          ticketId: "ticket-1",
          deviceId: "device-A",
          status: "confirmed",
        },
      ],
    });
    mockCreateDocument.mockResolvedValueOnce({});

    const results = await processBatchSync([
      makeInput({
        ticketId: "ticket-1",
        deviceId: "device-B",
        offlineMode: true,
      }),
    ]);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("conflicted");
    expect(results[0].conflictWith).toBe("existing-checkin-id");

    // Verify conflicted checkin doc created
    expect(mockCreateDocument).toHaveBeenCalledWith(
      "riffoff",
      "gate-checkins",
      "generated-id",
      expect.objectContaining({
        status: "conflicted",
        conflictWith: "existing-checkin-id",
      }),
    );
  });

  it("first sync wins: first device confirmed, second conflicted", async () => {
    // First device: no existing check-in
    mockListDocuments.mockResolvedValueOnce({ total: 0, documents: [] });
    mockGetDocument.mockResolvedValueOnce({
      $id: "ticket-1",
      eventId: "event-1",
      status: "active",
      checkedInAt: null,
    });
    mockCreateDocument.mockResolvedValueOnce({});
    mockUpdateDocument.mockResolvedValueOnce({});

    // Second device: now there IS an existing check-in from device-A
    mockListDocuments.mockResolvedValueOnce({
      total: 1,
      documents: [
        {
          $id: "generated-id",
          ticketId: "ticket-1",
          deviceId: "device-A",
          status: "confirmed",
        },
      ],
    });
    mockCreateDocument.mockResolvedValueOnce({});

    const results = await processBatchSync([
      makeInput({
        ticketId: "ticket-1",
        deviceId: "device-A",
        offlineMode: true,
      }),
      makeInput({
        ticketId: "ticket-1",
        deviceId: "device-B",
        offlineMode: true,
      }),
    ]);

    expect(results).toHaveLength(2);
    expect(results[0].status).toBe("confirmed");
    expect(results[1].status).toBe("conflicted");
    expect(results[1].conflictWith).toBe("generated-id");
  });
});
