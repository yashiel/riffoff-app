import { vi, describe, it, expect, beforeEach } from "vitest";

// ─── Mocks ──────────────────────────────────────────────────

const mockListDocuments = vi.fn();
const mockGetDocument = vi.fn();
const mockCreateDocument = vi.fn();
const mockUpdateDocument = vi.fn();
const mockAccountGet = vi.fn();

vi.mock("@/lib/appwrite/server", () => ({
  createAdminClient: vi.fn(() => ({
    databases: {
      listDocuments: mockListDocuments,
      getDocument: mockGetDocument,
      createDocument: mockCreateDocument,
      updateDocument: mockUpdateDocument,
    },
    users: {
      get: vi
        .fn()
        .mockResolvedValue({ name: "Test User", email: "test@test.com" }),
    },
  })),
  createSessionClient: vi.fn(() => ({
    account: { get: mockAccountGet },
  })),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/audit", () => ({ createAuditLog: vi.fn() }));
vi.mock("@/actions/notifications", () => ({ createNotification: vi.fn() }));
vi.mock("node-appwrite", () => ({
  ID: { unique: () => "mock-unique-id" },
  Query: {
    equal: (field: string, value: unknown) =>
      JSON.stringify({ type: "equal", field, value }),
    greaterThanEqual: (field: string, value: unknown) =>
      JSON.stringify({ type: "gte", field, value }),
    notEqual: (field: string, value: unknown) =>
      JSON.stringify({ type: "ne", field, value }),
    limit: (n: number) => JSON.stringify({ type: "limit", n }),
    offset: (n: number) => JSON.stringify({ type: "offset", n }),
    orderDesc: (field: string) => JSON.stringify({ type: "orderDesc", field }),
    contains: (field: string, value: unknown) =>
      JSON.stringify({ type: "contains", field, value }),
    isNull: (field: string) => JSON.stringify({ type: "isNull", field }),
  },
}));

// ─── Imports (after mocks) ──────────────────────────────────

import { createSessionClient } from "@/lib/appwrite/server";
import {
  submitReport,
  listModerationQueue,
  assignModerationItem,
  dismissModerationItem,
  bulkDismiss,
  getModerationStats,
} from "@/actions/moderation";

// ─── Helpers ────────────────────────────────────────────────

const ADMIN_USER = { $id: "admin-001", name: "Admin" };
const NORMAL_USER = { $id: "user-001", name: "Reporter" };

function mockAdminAuth() {
  mockAccountGet.mockResolvedValue(ADMIN_USER);
  // requireAdmin: listDocuments for profile lookup
  mockListDocuments.mockImplementation((_db: string, coll: string) => {
    // First call in requireAdmin fetches admin profile
    if (coll === "profiles") {
      return Promise.resolve({
        total: 1,
        documents: [
          {
            $id: "prof-admin",
            userId: ADMIN_USER.$id,
            role: "admin",
            displayName: "Admin User",
            communityRole: "member",
            warningCount: 0,
            banLevel: "none",
          },
        ],
      });
    }
    return Promise.resolve({ total: 0, documents: [] });
  });
}

// ─── Tests ──────────────────────────────────────────────────

describe("submitReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when not authenticated", async () => {
    vi.mocked(createSessionClient).mockResolvedValueOnce(null as never);

    const result = await submitReport("event", "evt-1", "spam");
    expect(result.error).toBe("Authentication required");
    expect(result.success).toBeUndefined();
  });

  it("returns error for invalid reason", async () => {
    // Zod validation fails before auth check
    const result = await submitReport(
      "event",
      "evt-1",
      "invalid_reason" as never,
    );
    expect(result.error).toBe("Invalid report data");
  });

  it("returns error for description > 500 chars", async () => {
    const longDesc = "x".repeat(501);
    const result = await submitReport("event", "evt-1", "spam", longDesc);
    expect(result.error).toBe("Invalid report data");
  });

  it("returns error when entity already reported by same user (duplicate check)", async () => {
    mockAccountGet.mockResolvedValue(NORMAL_USER);

    // Call sequence for submitReport:
    // 1. rate limit check → { total: 0 }
    // 2. dupe check → { total: 1 } (already reported)
    let callCount = 0;
    mockListDocuments.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // Rate limit check
        return Promise.resolve({ total: 0, documents: [] });
      }
      if (callCount === 2) {
        // Duplicate check → found existing report
        return Promise.resolve({ total: 1, documents: [{}] });
      }
      return Promise.resolve({ total: 0, documents: [] });
    });

    const result = await submitReport("event", "evt-1", "spam");
    expect(result.error).toBe("You have already reported this item");
  });

  it("returns success for valid report", async () => {
    mockAccountGet.mockResolvedValue(NORMAL_USER);

    let callCount = 0;
    mockListDocuments.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve({ total: 0, documents: [] }); // rate limit
      if (callCount === 2) return Promise.resolve({ total: 0, documents: [] }); // dupe check
      if (callCount === 3) return Promise.resolve({ total: 0, documents: [] }); // open reports check
      if (callCount === 4)
        return Promise.resolve({
          total: 1,
          documents: [
            {
              $id: "prof-user",
              userId: NORMAL_USER.$id,
              communityRole: "member",
            },
          ],
        }); // reporter profile
      return Promise.resolve({ total: 0, documents: [] });
    });
    mockCreateDocument.mockResolvedValue({ $id: "mod-item-1" });

    const result = await submitReport(
      "event",
      "evt-1",
      "spam",
      "Looks like spam",
    );
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
    expect(mockCreateDocument).toHaveBeenCalledTimes(1);
  });

  it("auto-escalates to 'high' when 3+ open reports exist on entity", async () => {
    mockAccountGet.mockResolvedValue(NORMAL_USER);

    let callCount = 0;
    mockListDocuments.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve({ total: 0, documents: [] }); // rate limit
      if (callCount === 2) return Promise.resolve({ total: 0, documents: [] }); // dupe check
      if (callCount === 3) return Promise.resolve({ total: 3, documents: [] }); // 3 open reports → escalate
      if (callCount === 4)
        return Promise.resolve({
          total: 1,
          documents: [
            {
              $id: "prof-user",
              userId: NORMAL_USER.$id,
              communityRole: "member",
            },
          ],
        }); // reporter profile
      return Promise.resolve({ total: 0, documents: [] });
    });
    mockCreateDocument.mockResolvedValue({ $id: "mod-item-2" });

    const result = await submitReport("event", "evt-1", "spam"); // spam normally → "low"
    expect(result.success).toBe(true);

    // Verify priority was escalated to "high" (spam is normally "low")
    const createCall = mockCreateDocument.mock.calls[0];
    const docData = createCall[3]; // 4th arg is the data object
    expect(docData.priority).toBe("high");
  });

  it("assigns priority based on reason map (scam → critical, spam → low)", async () => {
    mockAccountGet.mockResolvedValue(NORMAL_USER);

    let callCount = 0;
    mockListDocuments.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve({ total: 0, documents: [] }); // rate limit
      if (callCount === 2) return Promise.resolve({ total: 0, documents: [] }); // dupe
      if (callCount === 3) return Promise.resolve({ total: 0, documents: [] }); // open reports
      if (callCount === 4)
        return Promise.resolve({
          total: 1,
          documents: [
            {
              $id: "prof-user",
              userId: NORMAL_USER.$id,
              communityRole: "member",
            },
          ],
        }); // reporter profile
      return Promise.resolve({ total: 0, documents: [] });
    });
    mockCreateDocument.mockResolvedValue({ $id: "mod-item-3" });

    await submitReport("event", "evt-1", "scam");

    const createCall = mockCreateDocument.mock.calls[0];
    const docData = createCall[3];
    expect(docData.priority).toBe("critical");
  });
});

describe("listModerationQueue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty when not admin", async () => {
    vi.mocked(createSessionClient).mockResolvedValueOnce(null as never);

    const result = await listModerationQueue();
    expect(result).toEqual({ items: [], total: 0 });
  });

  it("returns paginated results with filters", async () => {
    mockAdminAuth();

    const mockItems = [
      { $id: "item-1", status: "open", priority: "high", entityType: "event" },
      { $id: "item-2", status: "open", priority: "high", entityType: "event" },
    ];

    // Override: first call is requireAdmin profile lookup, second is the actual query
    let callCount = 0;
    mockListDocuments.mockImplementation((_db: string, coll: string) => {
      callCount++;
      if (callCount === 1 && coll === "profiles") {
        return Promise.resolve({
          total: 1,
          documents: [
            {
              $id: "prof-admin",
              userId: ADMIN_USER.$id,
              role: "admin",
              displayName: "Admin User",
            },
          ],
        });
      }
      // The actual moderation query
      return Promise.resolve({ total: 15, documents: mockItems });
    });

    const result = await listModerationQueue("open", "high", "event", 1, 20);
    expect(result.total).toBe(15);
    expect(result.items).toHaveLength(2);
  });

  it("handles empty results", async () => {
    mockAdminAuth();

    let callCount = 0;
    mockListDocuments.mockImplementation((_db: string, coll: string) => {
      callCount++;
      if (callCount === 1 && coll === "profiles") {
        return Promise.resolve({
          total: 1,
          documents: [
            {
              $id: "prof-admin",
              userId: ADMIN_USER.$id,
              role: "admin",
              displayName: "Admin User",
            },
          ],
        });
      }
      return Promise.resolve({ total: 0, documents: [] });
    });

    const result = await listModerationQueue("open");
    expect(result.total).toBe(0);
    expect(result.items).toEqual([]);
  });
});

describe("assignModerationItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires admin", async () => {
    vi.mocked(createSessionClient).mockResolvedValueOnce(null as never);

    const result = await assignModerationItem("item-1");
    expect(result.error).toBe("Admin access required");
  });

  it("self-assigns to the authenticated admin", async () => {
    mockAdminAuth();
    mockUpdateDocument.mockResolvedValue({ $id: "item-1" });

    const result = await assignModerationItem("item-1");
    expect(result.error).toBeUndefined();
    expect(mockUpdateDocument).toHaveBeenCalledWith(
      "riffoff",
      "moderation-items",
      "item-1",
      { assignedTo: ADMIN_USER.$id, status: "in_review" },
    );
  });
});

describe("dismissModerationItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires admin", async () => {
    vi.mocked(createSessionClient).mockResolvedValueOnce(null as never);

    const result = await dismissModerationItem("item-1", "Not relevant");
    expect(result.error).toBe("Admin access required");
  });

  it("sets status to dismissed, creates note", async () => {
    mockAdminAuth();
    mockUpdateDocument.mockResolvedValue({ $id: "item-1" });
    mockCreateDocument.mockResolvedValue({ $id: "note-1" });

    const result = await dismissModerationItem("item-1", "False positive");
    expect(result.error).toBeUndefined();

    // Check the moderation item update
    expect(mockUpdateDocument).toHaveBeenCalledWith(
      "riffoff",
      "moderation-items",
      "item-1",
      expect.objectContaining({
        status: "dismissed",
        resolvedBy: ADMIN_USER.$id,
      }),
    );

    // Check that a note was created
    expect(mockCreateDocument).toHaveBeenCalledWith(
      "riffoff",
      "moderation-notes",
      "mock-unique-id",
      expect.objectContaining({
        moderationItemId: "item-1",
        authorId: ADMIN_USER.$id,
        body: "False positive",
      }),
    );
  });
});

describe("bulkDismiss", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires admin", async () => {
    vi.mocked(createSessionClient).mockResolvedValueOnce(null as never);

    const result = await bulkDismiss(["item-1", "item-2"]);
    expect(result.error).toBe("Admin access required");
    expect(result.count).toBe(0);
  });

  it("rejects > 50 items", async () => {
    mockAdminAuth();

    const ids = Array.from({ length: 51 }, (_, i) => `item-${i}`);
    const result = await bulkDismiss(ids);
    expect(result.error).toBe("Provide 1-50 item IDs");
    expect(result.count).toBe(0);
  });

  it("returns count of dismissed items", async () => {
    mockAdminAuth();
    mockUpdateDocument.mockResolvedValue({});

    const result = await bulkDismiss(["item-1", "item-2", "item-3"]);
    expect(result.count).toBe(3);
    expect(result.error).toBeUndefined();
    expect(mockUpdateDocument).toHaveBeenCalledTimes(3);
  });
});

describe("getModerationStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns correct aggregate counts", async () => {
    mockAdminAuth();

    // After the profile lookup for requireAdmin, getModerationStats issues
    // 5 parallel listDocuments calls via Promise.all
    let callCount = 0;
    mockListDocuments.mockImplementation((_db: string, coll: string) => {
      callCount++;
      if (callCount === 1 && coll === "profiles") {
        return Promise.resolve({
          total: 1,
          documents: [
            {
              $id: "prof-admin",
              userId: ADMIN_USER.$id,
              role: "admin",
              displayName: "Admin User",
            },
          ],
        });
      }
      // The 5 parallel stats queries: open, critical, inReview, actioned, dismissed
      const statsTotals = [42, 5, 10, 100, 30];
      const idx = callCount - 2; // 0-indexed after profile lookup
      if (idx >= 0 && idx < statsTotals.length) {
        return Promise.resolve({
          total: statsTotals[idx],
          documents: [],
        });
      }
      return Promise.resolve({ total: 0, documents: [] });
    });

    const stats = await getModerationStats();
    expect(stats).not.toBeNull();
    expect(stats!.open).toBe(42);
    expect(stats!.critical).toBe(5);
    expect(stats!.inReview).toBe(10);
    expect(stats!.actionedThisMonth).toBe(100);
    expect(stats!.dismissedThisMonth).toBe(30);
  });
});
