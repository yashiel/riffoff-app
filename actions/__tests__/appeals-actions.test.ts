import { vi, describe, it, expect, beforeEach } from "vitest";

// ─── Mocks ──────────────────────────────────────────

const mockListDocuments = vi.fn();
const mockGetDocument = vi.fn();
const mockCreateDocument = vi.fn();
const mockUpdateDocument = vi.fn();
const mockAccountGet = vi.fn();

let _sessionClientOverride: unknown = undefined;

vi.mock("@/lib/appwrite/server", () => ({
  createAdminClient: vi.fn(() => ({
    databases: {
      listDocuments: mockListDocuments,
      getDocument: mockGetDocument,
      createDocument: mockCreateDocument,
      updateDocument: mockUpdateDocument,
    },
    users: {
      get: vi.fn().mockResolvedValue({ name: "Test", email: "t@t.com" }),
    },
  })),
  createSessionClient: vi.fn(() => _sessionClientOverride),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/audit", () => ({ createAuditLog: vi.fn() }));
vi.mock("@/actions/notifications", () => ({ createNotification: vi.fn() }));
vi.mock("@/actions/warnings", () => ({ liftBan: vi.fn() }));

// ─── Constants ──────────────────────────────────────

const USER_ID = "user-001";
const ADMIN_ID = "admin-001";
const MOD_ITEM_ID = "mod-001";
const APPEAL_ID = "appeal-001";
const MODERATOR_ID = "moderator-999";

// ─── Helpers ────────────────────────────────────────

function mockUnauthenticated() {
  _sessionClientOverride = null;
}

function mockAuthenticatedUser(userId = USER_ID) {
  mockAccountGet.mockResolvedValue({ $id: userId });
  _sessionClientOverride = { account: { get: mockAccountGet } };
}

/** Set up mocks so requireAdmin() succeeds */
function mockAdminAuth(adminId = ADMIN_ID) {
  mockAccountGet.mockResolvedValue({ $id: adminId });
  _sessionClientOverride = { account: { get: mockAccountGet } };
  // requireAdmin calls listDocuments for profile lookup
  mockListDocuments.mockResolvedValueOnce({
    documents: [{ $id: "prof-admin", userId: adminId, role: "admin" }],
    total: 1,
  });
}

function makeModItem(overrides: Record<string, unknown> = {}) {
  return {
    $id: MOD_ITEM_ID,
    status: "actioned",
    entityType: "user" as const,
    entityId: USER_ID,
    resolvedBy: MODERATOR_ID,
    resolvedAt: new Date().toISOString(),
    actionTaken: "warned",
    reason: "Spam",
    ...overrides,
  };
}

function makeAppeal(overrides: Record<string, unknown> = {}) {
  return {
    $id: APPEAL_ID,
    moderationItemId: MOD_ITEM_ID,
    appealerId: USER_ID,
    status: "pending",
    reviewedBy: null,
    reviewNote: null,
    resolvedAt: null,
    ...overrides,
  };
}

// ─── Import SUT ─────────────────────────────────────

import { fileAppeal, reviewAppeal, listAppeals, getMyAppeals } from "../appeals";

// ─── fileAppeal ─────────────────────────────────────

describe("fileAppeal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticatedUser();
  });

  it("returns error when not authenticated", async () => {
    mockUnauthenticated();
    const result = await fileAppeal(MOD_ITEM_ID, "This is my valid reason for appeal.");
    expect(result).toEqual({ error: "Authentication required" });
  });

  it("returns error for reason < 10 chars", async () => {
    const result = await fileAppeal(MOD_ITEM_ID, "Short");
    expect(result).toHaveProperty("error");
  });

  it("returns error for reason > 1000 chars", async () => {
    const result = await fileAppeal(MOD_ITEM_ID, "x".repeat(1001));
    expect(result).toHaveProperty("error");
  });

  it("returns error when moderation item doesn't exist", async () => {
    mockGetDocument.mockRejectedValueOnce(new Error("Not found"));
    const result = await fileAppeal(MOD_ITEM_ID, "This is my valid reason for appeal.");
    expect(result).toEqual({ error: "Moderation item not found" });
  });

  it("returns error when moderation item is not actioned", async () => {
    mockGetDocument.mockResolvedValueOnce(makeModItem({ status: "pending" }));
    const result = await fileAppeal(MOD_ITEM_ID, "This is my valid reason for appeal.");
    expect(result).toEqual({ error: "Only actioned moderation items can be appealed" });
  });

  it("returns error when user is not the affected party", async () => {
    mockGetDocument.mockResolvedValueOnce(makeModItem({ entityId: "other-user-999" }));
    const result = await fileAppeal(MOD_ITEM_ID, "This is my valid reason for appeal.");
    expect(result).toEqual({ error: "You can only appeal actions taken against you" });
  });

  it("returns error when appeal already exists for this item", async () => {
    mockGetDocument.mockResolvedValueOnce(makeModItem());
    mockListDocuments.mockResolvedValueOnce({ documents: [{ $id: "existing" }], total: 1 });

    const result = await fileAppeal(MOD_ITEM_ID, "This is my valid reason for appeal.");
    expect(result).toEqual({ error: "An appeal has already been filed for this moderation action" });
  });

  it("returns error when filing after 30-day window", async () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 31);
    mockGetDocument.mockResolvedValueOnce(makeModItem({ resolvedAt: oldDate.toISOString() }));
    mockListDocuments.mockResolvedValueOnce({ documents: [], total: 0 });

    const result = await fileAppeal(MOD_ITEM_ID, "This is my valid reason for appeal.");
    expect(result).toHaveProperty("error");
    expect(result.error).toContain("30 days");
  });

  it("allows 90-day window for permanent bans", async () => {
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    mockGetDocument.mockResolvedValueOnce(
      makeModItem({
        resolvedAt: sixtyDaysAgo.toISOString(),
        actionTaken: "permanent_ban",
      }),
    );
    mockListDocuments.mockResolvedValueOnce({ documents: [], total: 0 });
    mockCreateDocument.mockResolvedValueOnce({ $id: "new-appeal-001" });

    const result = await fileAppeal(MOD_ITEM_ID, "This is my valid reason for appeal regarding a permanent ban.");
    expect(result.success).toBe(true);
    expect(result.appealId).toBe("new-appeal-001");
  });

  it("returns success with appealId for valid appeal", async () => {
    mockGetDocument.mockResolvedValueOnce(makeModItem());
    mockListDocuments.mockResolvedValueOnce({ documents: [], total: 0 });
    mockCreateDocument.mockResolvedValueOnce({ $id: "new-appeal-002" });

    const result = await fileAppeal(MOD_ITEM_ID, "This moderation action was incorrect because the content was satire.");
    expect(result.success).toBe(true);
    expect(result.appealId).toBe("new-appeal-002");
    expect(mockCreateDocument).toHaveBeenCalledOnce();
  });
});

// ─── reviewAppeal ───────────────────────────────────

describe("reviewAppeal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires admin", async () => {
    mockUnauthenticated();
    const result = await reviewAppeal(APPEAL_ID, "upheld", "This is a thorough review note.");
    expect(result).toEqual({ error: "Admin access required" });
  });

  it("returns error when reviewer is same as original moderator", async () => {
    mockAdminAuth(MODERATOR_ID);
    mockGetDocument.mockResolvedValueOnce(makeAppeal());
    mockGetDocument.mockResolvedValueOnce(makeModItem({ resolvedBy: MODERATOR_ID }));

    const result = await reviewAppeal(APPEAL_ID, "upheld", "This is a valid review note for the appeal.");
    expect(result).toHaveProperty("error");
    expect(result.error).toContain("cannot review this appeal");
  });

  it("upheld — updates status and sends notification", async () => {
    mockAdminAuth();
    mockGetDocument.mockResolvedValueOnce(makeAppeal());
    mockGetDocument.mockResolvedValueOnce(makeModItem());
    mockUpdateDocument.mockResolvedValueOnce({});

    const result = await reviewAppeal(APPEAL_ID, "upheld", "After thorough review, the original decision stands.");
    expect(result).toEqual({ success: true });

    const updateArgs = mockUpdateDocument.mock.calls[0];
    expect(updateArgs[3].status).toBe("upheld");
    expect(updateArgs[3].reviewedBy).toBe(ADMIN_ID);
  });

  it("overturned — updates status, reverses action, sends notification", async () => {
    mockAdminAuth();
    mockGetDocument.mockResolvedValueOnce(makeAppeal());
    mockGetDocument.mockResolvedValueOnce(makeModItem({ actionTaken: "warned" }));
    mockUpdateDocument.mockResolvedValueOnce({});
    // reverseAction internals: listDocuments for warnings
    mockListDocuments.mockResolvedValueOnce({ documents: [], total: 0 });

    const result = await reviewAppeal(APPEAL_ID, "overturned", "After review, the original moderation was incorrect.");
    expect(result).toEqual({ success: true });

    const updateArgs = mockUpdateDocument.mock.calls[0];
    expect(updateArgs[3].status).toBe("overturned");
  });

  it("returns error for already-resolved appeal", async () => {
    mockAdminAuth();
    mockGetDocument.mockResolvedValueOnce(makeAppeal({ status: "upheld" }));

    const result = await reviewAppeal(APPEAL_ID, "upheld", "Attempting to re-review a resolved appeal.");
    expect(result).toEqual({ error: "This appeal has already been resolved" });
  });
});

// ─── listAppeals ────────────────────────────────────

describe("listAppeals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires admin — returns empty for non-admin", async () => {
    mockUnauthenticated();
    const result = await listAppeals();
    expect(result).toEqual({ appeals: [], total: 0 });
  });

  it("returns filtered paginated results", async () => {
    mockAdminAuth();
    mockListDocuments.mockResolvedValueOnce({
      documents: [
        { $id: "a1", moderationItemId: "m1", appealerId: "u1", status: "pending" },
      ],
      total: 1,
    });
    mockGetDocument.mockResolvedValueOnce({
      $id: "m1",
      entityType: "user",
      reason: "Spam content",
    });

    const result = await listAppeals("pending", 1, 10);
    expect(result.total).toBe(1);
    expect(result.appeals).toHaveLength(1);
    expect(result.appeals[0].entityType).toBe("user");
    expect(result.appeals[0].moderationReason).toBe("Spam content");
  });
});

// ─── getMyAppeals ───────────────────────────────────

describe("getMyAppeals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty array when not authenticated", async () => {
    mockUnauthenticated();
    const result = await getMyAppeals();
    expect(result).toEqual([]);
  });

  it("returns only current user's appeals", async () => {
    mockAuthenticatedUser();
    mockListDocuments.mockResolvedValueOnce({
      documents: [
        { $id: "a1", moderationItemId: "m1", appealerId: USER_ID, status: "pending" },
        { $id: "a2", moderationItemId: "m2", appealerId: USER_ID, status: "upheld" },
      ],
      total: 2,
    });
    mockGetDocument.mockResolvedValueOnce({
      $id: "m1",
      entityType: "event",
      reason: "Misleading event info",
      actionTaken: "event_suspended",
    });
    mockGetDocument.mockResolvedValueOnce({
      $id: "m2",
      entityType: "user",
      reason: "Harassment",
      actionTaken: "warned",
    });

    const result = await getMyAppeals();
    expect(result).toHaveLength(2);
    expect(result[0].moderationReason).toBe("Misleading event info");
    expect(result[1].actionTaken).toBe("warned");
  });
});
