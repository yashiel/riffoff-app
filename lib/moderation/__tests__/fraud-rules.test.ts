import { vi, describe, it, expect, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — must be declared before importing the module under test
// ---------------------------------------------------------------------------

const mockListDocuments = vi.fn();
const mockGetDocument = vi.fn();
const mockCreateDocument = vi.fn();

vi.mock("@/lib/appwrite/server", () => ({
  createAdminClient: vi.fn(() => ({
    databases: {
      listDocuments: mockListDocuments,
      getDocument: mockGetDocument,
      createDocument: mockCreateDocument,
    },
  })),
}));

vi.mock("@/lib/appwrite/config", () => ({
  DATABASE_ID: "test-db",
  COLLECTIONS: {
    EVENTS: "events",
    PROFILES: "profiles",
    TICKETS: "tickets",
    ORDERS: "orders",
    MODERATION_ITEMS: "moderation_items",
  },
}));

// Import after mocks are set up
import {
  checkDuplicateEvent,
  checkRapidEventCreation,
  checkNewAccountHighValue,
  checkHighCancellationRate,
  checkMassTicketPurchase,
  checkRapidRefundPattern,
  createFraudModerationItem,
  runEventPublishFraudChecks,
  type FraudSignal,
} from "../fraud-rules";

// ---------------------------------------------------------------------------
// Reset mocks between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// checkDuplicateEvent (FRAUD-01)
// ---------------------------------------------------------------------------

describe("checkDuplicateEvent", () => {
  it("returns signal when duplicate event found", async () => {
    mockListDocuments.mockResolvedValueOnce({
      documents: [{ $id: "dup-1", title: "Rock Fest" }],
    });

    const result = await checkDuplicateEvent(
      "evt-new",
      "org-1",
      "Rock Fest",
      "2026-06-15T20:00:00.000Z",
    );

    expect(result).not.toBeNull();
    expect(result!.ruleId).toBe("FRAUD-01");
    expect(result!.priority).toBe("high");
    expect(result!.entityType).toBe("event");
    expect(result!.entityId).toBe("evt-new");
  });

  it("returns null when no duplicate found", async () => {
    mockListDocuments.mockResolvedValueOnce({ documents: [] });

    const result = await checkDuplicateEvent(
      "evt-new",
      "org-1",
      "Rock Fest",
      "2026-06-15T20:00:00.000Z",
    );

    expect(result).toBeNull();
  });

  it("returns null on Appwrite error", async () => {
    mockListDocuments.mockRejectedValueOnce(new Error("Network error"));

    const result = await checkDuplicateEvent(
      "evt-new",
      "org-1",
      "Rock Fest",
      "2026-06-15T20:00:00.000Z",
    );

    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// checkRapidEventCreation (FRAUD-03)
// ---------------------------------------------------------------------------

describe("checkRapidEventCreation", () => {
  it("returns signal when 5+ events created in 1 hour", async () => {
    mockListDocuments.mockResolvedValueOnce({ total: 7 });

    const result = await checkRapidEventCreation("org-1");

    expect(result).not.toBeNull();
    expect(result!.ruleId).toBe("FRAUD-03");
    expect(result!.priority).toBe("high");
    expect(result!.entityType).toBe("user");
    expect(result!.entityId).toBe("org-1");
    expect(result!.description).toContain("7");
  });

  it("returns null when fewer than 5 events in 1 hour", async () => {
    mockListDocuments.mockResolvedValueOnce({ total: 3 });

    const result = await checkRapidEventCreation("org-1");

    expect(result).toBeNull();
  });

  it("returns null on Appwrite error", async () => {
    mockListDocuments.mockRejectedValueOnce(new Error("DB timeout"));

    const result = await checkRapidEventCreation("org-1");

    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// checkNewAccountHighValue (FRAUD-05)
// ---------------------------------------------------------------------------

describe("checkNewAccountHighValue", () => {
  it("returns signal for new account (<24h) with high price", async () => {
    // Account created 2 hours ago
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    mockListDocuments.mockResolvedValueOnce({
      documents: [{ $id: "profile-1", $createdAt: twoHoursAgo }],
    });

    const result = await checkNewAccountHighValue("org-new", 100_000); // $1000

    expect(result).not.toBeNull();
    expect(result!.ruleId).toBe("FRAUD-05");
    expect(result!.priority).toBe("high");
    expect(result!.entityType).toBe("user");
  });

  it("returns null for old account with high price", async () => {
    // Account created 30 days ago
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    mockListDocuments.mockResolvedValueOnce({
      documents: [{ $id: "profile-1", $createdAt: thirtyDaysAgo }],
    });

    const result = await checkNewAccountHighValue("org-old", 100_000);

    expect(result).toBeNull();
  });

  it("returns null when ticket price is below threshold", async () => {
    // Price $400 (40000 cents) is below $500 threshold (50000 cents)
    const result = await checkNewAccountHighValue("org-new", 40_000);

    expect(result).toBeNull();
    // Should not even call Appwrite since price check happens first
    expect(mockListDocuments).not.toHaveBeenCalled();
  });

  it("returns null when no profile found", async () => {
    mockListDocuments.mockResolvedValueOnce({ documents: [] });

    const result = await checkNewAccountHighValue("org-ghost", 100_000);

    expect(result).toBeNull();
  });

  it("returns null on Appwrite error", async () => {
    mockListDocuments.mockRejectedValueOnce(new Error("DB error"));

    const result = await checkNewAccountHighValue("org-err", 100_000);

    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// checkHighCancellationRate (FRAUD-06)
// ---------------------------------------------------------------------------

describe("checkHighCancellationRate", () => {
  it("returns signal when 3+ cancellations in 30 days", async () => {
    mockListDocuments.mockResolvedValueOnce({ total: 5 });

    const result = await checkHighCancellationRate("org-cancel");

    expect(result).not.toBeNull();
    expect(result!.ruleId).toBe("FRAUD-06");
    expect(result!.priority).toBe("critical");
    expect(result!.entityType).toBe("user");
    expect(result!.entityId).toBe("org-cancel");
  });

  it("returns null when fewer than 3 cancellations", async () => {
    mockListDocuments.mockResolvedValueOnce({ total: 2 });

    const result = await checkHighCancellationRate("org-ok");

    expect(result).toBeNull();
  });

  it("returns null on Appwrite error", async () => {
    mockListDocuments.mockRejectedValueOnce(new Error("Connection lost"));

    const result = await checkHighCancellationRate("org-err");

    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// checkMassTicketPurchase (FRAUD-04)
// ---------------------------------------------------------------------------

describe("checkMassTicketPurchase", () => {
  it("returns signal when 10+ tickets purchased in 1 hour", async () => {
    mockListDocuments.mockResolvedValueOnce({ total: 15 });

    const result = await checkMassTicketPurchase("user-scalper");

    expect(result).not.toBeNull();
    expect(result!.ruleId).toBe("FRAUD-04");
    expect(result!.priority).toBe("medium");
    expect(result!.entityType).toBe("user");
    expect(result!.entityId).toBe("user-scalper");
  });

  it("returns null when fewer than 10 tickets in 1 hour", async () => {
    mockListDocuments.mockResolvedValueOnce({ total: 4 });

    const result = await checkMassTicketPurchase("user-ok");

    expect(result).toBeNull();
  });

  it("returns null on Appwrite error", async () => {
    mockListDocuments.mockRejectedValueOnce(new Error("Query failed"));

    const result = await checkMassTicketPurchase("user-err");

    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// checkRapidRefundPattern (FRAUD-07)
// ---------------------------------------------------------------------------

describe("checkRapidRefundPattern", () => {
  it("returns signal when 5+ refunds in 1 hour", async () => {
    mockListDocuments.mockResolvedValueOnce({ total: 8 });

    const result = await checkRapidRefundPattern("evt-refund");

    expect(result).not.toBeNull();
    expect(result!.ruleId).toBe("FRAUD-07");
    expect(result!.priority).toBe("high");
    expect(result!.entityType).toBe("event");
    expect(result!.entityId).toBe("evt-refund");
  });

  it("returns null when fewer than 5 refunds in 1 hour", async () => {
    mockListDocuments.mockResolvedValueOnce({ total: 2 });

    const result = await checkRapidRefundPattern("evt-ok");

    expect(result).toBeNull();
  });

  it("returns null on Appwrite error", async () => {
    mockListDocuments.mockRejectedValueOnce(new Error("Timeout"));

    const result = await checkRapidRefundPattern("evt-err");

    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// createFraudModerationItem
// ---------------------------------------------------------------------------

describe("createFraudModerationItem", () => {
  const signal: FraudSignal = {
    ruleId: "FRAUD-01",
    reason: "fraud",
    description: "Duplicate event detected",
    priority: "high",
    entityType: "event",
    entityId: "evt-1",
  };

  it("creates a moderation document with correct fields", async () => {
    mockCreateDocument.mockResolvedValueOnce({ $id: "mod-1" });

    await createFraudModerationItem(signal);

    expect(mockCreateDocument).toHaveBeenCalledOnce();
    const [dbId, collId, _docId, data] = mockCreateDocument.mock.calls[0];
    expect(dbId).toBe("test-db");
    expect(collId).toBe("moderation_items");
    expect(data.entityType).toBe("event");
    expect(data.entityId).toBe("evt-1");
    expect(data.source).toBe("system");
    expect(data.reason).toBe("fraud");
    expect(data.priority).toBe("high");
    expect(data.status).toBe("open");
    expect(data.description).toContain("[FRAUD-01]");
    expect(data.description).toContain("Duplicate event detected");
  });

  it("never throws even on Appwrite error", async () => {
    mockCreateDocument.mockRejectedValueOnce(new Error("Write failed"));

    // Should not throw
    await expect(createFraudModerationItem(signal)).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// runEventPublishFraudChecks
// ---------------------------------------------------------------------------

describe("runEventPublishFraudChecks", () => {
  it("returns array of signals from multiple triggered rules", async () => {
    // Call 1: checkDuplicateEvent → finds duplicate
    mockListDocuments.mockResolvedValueOnce({
      documents: [{ $id: "dup-1", title: "Rock Fest" }],
    });
    // Call 2: checkRapidEventCreation → 7 events
    mockListDocuments.mockResolvedValueOnce({ total: 7 });
    // Call 3: checkNewAccountHighValue → price below threshold so no DB call needed
    //         Actually, price > 50000, so it will call DB
    //         Account created 1h ago
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();
    mockListDocuments.mockResolvedValueOnce({
      documents: [{ $id: "p-1", $createdAt: oneHourAgo }],
    });
    // Call 4: checkHighCancellationRate → 4 cancellations
    mockListDocuments.mockResolvedValueOnce({ total: 4 });
    // Call 5: checkRapidRefundPattern → 6 refunds
    mockListDocuments.mockResolvedValueOnce({ total: 6 });

    const signals = await runEventPublishFraudChecks(
      "evt-new",
      "org-1",
      "Rock Fest",
      "2026-06-15T20:00:00.000Z",
      100_000, // $1000
    );

    // All 5 rules should trigger
    expect(signals.length).toBe(5);
    const ruleIds = signals.map((s) => s.ruleId);
    expect(ruleIds).toContain("FRAUD-01");
    expect(ruleIds).toContain("FRAUD-03");
    expect(ruleIds).toContain("FRAUD-05");
    expect(ruleIds).toContain("FRAUD-06");
    expect(ruleIds).toContain("FRAUD-07");
  });

  it("returns empty array when no rules trigger", async () => {
    // checkDuplicateEvent → no duplicates
    mockListDocuments.mockResolvedValueOnce({ documents: [] });
    // checkRapidEventCreation → 1 event
    mockListDocuments.mockResolvedValueOnce({ total: 1 });
    // checkNewAccountHighValue → price is 10000 (below threshold), no DB call
    // checkHighCancellationRate → 0 cancellations
    mockListDocuments.mockResolvedValueOnce({ total: 0 });
    // checkRapidRefundPattern → 0 refunds
    mockListDocuments.mockResolvedValueOnce({ total: 0 });

    const signals = await runEventPublishFraudChecks(
      "evt-safe",
      "org-good",
      "Jazz Night",
      "2026-07-01T19:00:00.000Z",
      10_000, // $100 — below threshold, no FRAUD-05 DB call
    );

    expect(signals).toEqual([]);
  });

  it("returns empty array when all rules throw errors", async () => {
    // All DB calls reject
    mockListDocuments.mockRejectedValue(new Error("Total outage"));

    const signals = await runEventPublishFraudChecks(
      "evt-x",
      "org-x",
      "Broken",
      "2026-01-01T00:00:00.000Z",
      100_000,
    );

    expect(signals).toEqual([]);
  });
});
