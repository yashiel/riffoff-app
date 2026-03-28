import { vi, describe, it, expect, beforeEach } from "vitest";

// ─── Mocks ──────────────────────────────────────────────────────────────

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
  createSessionClient: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/audit", () => ({ createAuditLog: vi.fn() }));
vi.mock("@/actions/notifications", () => ({ createNotification: vi.fn() }));
vi.mock("@/lib/utils", () => ({
  serialize: <T>(v: T): T => v,
  cn: (...args: unknown[]) => args.join(" "),
}));

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
    orderDesc: (field: string) =>
      JSON.stringify({ type: "orderDesc", field }),
    contains: (field: string, value: unknown) =>
      JSON.stringify({ type: "contains", field, value }),
    isNull: (field: string) => JSON.stringify({ type: "isNull", field }),
    select: (fields: string[]) =>
      JSON.stringify({ type: "select", fields }),
  },
}));

// ─── Imports (after mocks) ──────────────────────────────────────────────

import { createSessionClient } from "@/lib/appwrite/server";
import { createAuditLog } from "@/lib/audit";

// Moderation actions
import {
  submitReport,
  listModerationQueue,
  getModerationDetail,
  assignModerationItem,
  dismissModerationItem,
  actionModerationItem,
  addModerationNote,
  bulkDismiss,
  bulkAssign,
  getModerationStats,
} from "@/actions/moderation";

// Warning / Ban actions
import {
  warnUser,
  tempBanUser,
  permanentBanUser,
  liftBan,
  autoLiftExpiredBan,
} from "@/actions/warnings";

// Appeal actions
import { fileAppeal, reviewAppeal, listAppeals } from "@/actions/appeals";

// Community actions
import {
  promoteToGuardian,
  demoteFromGuardian,
} from "@/actions/community";

// Trust score / verification actions
import {
  getOrganiserTrustData,
  adminRecomputeTrustScore,
  verifyOrganiser,
} from "@/actions/trust-score";

// Rating actions
import { getEventRatings } from "@/actions/ratings";

// Pure trust score computation
import { computeTrustScore } from "@/lib/moderation/trust-score";

// ─── Helpers ────────────────────────────────────────────────────────────

const ADMIN_USER = { $id: "admin-001", name: "Admin" };
const REGULAR_USER = { $id: "user-001", name: "Regular" };

function makeProfile(overrides: Record<string, unknown> = {}) {
  return {
    $id: "prof-1",
    $createdAt: "2025-01-01T00:00:00.000Z",
    userId: ADMIN_USER.$id,
    role: "admin",
    displayName: "Admin User",
    communityRole: "member",
    warningCount: 0,
    banLevel: "none",
    banExpiresAt: null,
    isVerified: false,
    trustScore: 80,
    totalEventsAttended: 0,
    bio: null,
    ...overrides,
  };
}

function mockAdmin(userId = ADMIN_USER.$id) {
  mockAccountGet.mockResolvedValue({ $id: userId, name: "Admin" });
  vi.mocked(createSessionClient).mockResolvedValue({
    account: {
      get: vi.fn().mockResolvedValue({ $id: userId, name: "Admin" }),
    },
  } as never);
}

function mockRegularUser(userId = REGULAR_USER.$id) {
  mockAccountGet.mockResolvedValue({ $id: userId, name: "Regular" });
  vi.mocked(createSessionClient).mockResolvedValue({
    account: {
      get: vi.fn().mockResolvedValue({ $id: userId, name: "Regular" }),
    },
  } as never);
}

function mockUnauthenticated() {
  vi.mocked(createSessionClient).mockResolvedValue(null as never);
}

/**
 * Set up mockListDocuments so that any profiles query returns the given
 * profile, and all other collection queries return empty.
 */
function setupAdminProfile(userId = ADMIN_USER.$id) {
  mockListDocuments.mockImplementation(
    (_db: string, coll: string) => {
      if (coll === "profiles") {
        return Promise.resolve({
          total: 1,
          documents: [makeProfile({ userId, $id: `prof-${userId}` })],
        });
      }
      return Promise.resolve({ total: 0, documents: [] });
    },
  );
}

function setupNonAdminProfile(userId = REGULAR_USER.$id) {
  mockListDocuments.mockImplementation(
    (_db: string, coll: string) => {
      if (coll === "profiles") {
        return Promise.resolve({
          total: 1,
          documents: [
            makeProfile({
              userId,
              $id: `prof-${userId}`,
              role: "attendee",
            }),
          ],
        });
      }
      return Promise.resolve({ total: 0, documents: [] });
    },
  );
}

// ─── Tests ──────────────────────────────────────────────────────────────

describe("Moderation Security Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ════════════════════════════════════════════════════════════════════════
  // 1. ACCESS CONTROL — AUTHZ-01: Deny by Default
  // ════════════════════════════════════════════════════════════════════════

  describe("Access Control — unauthenticated users rejected", () => {
    beforeEach(() => {
      mockUnauthenticated();
    });

    it("listModerationQueue returns empty for unauthenticated users", async () => {
      const result = await listModerationQueue();
      expect(result).toEqual({ items: [], total: 0 });
    });

    it("getModerationDetail returns null for unauthenticated users", async () => {
      const result = await getModerationDetail("item-1");
      expect(result).toBeNull();
    });

    it("assignModerationItem returns error for unauthenticated users", async () => {
      const result = await assignModerationItem("item-1");
      expect(result.error).toBeTruthy();
    });

    it("dismissModerationItem returns error for unauthenticated users", async () => {
      const result = await dismissModerationItem("item-1", "test reason");
      expect(result.error).toBeTruthy();
    });

    it("actionModerationItem returns error for unauthenticated users", async () => {
      const result = await actionModerationItem("item-1", "warn_user");
      expect(result.error).toBeTruthy();
    });

    it("addModerationNote returns error for unauthenticated users", async () => {
      const result = await addModerationNote("item-1", "A note");
      expect(result.error).toBeTruthy();
    });

    it("bulkDismiss returns error for unauthenticated users", async () => {
      const result = await bulkDismiss(["id1"]);
      expect(result.error).toBeTruthy();
      expect(result.count).toBe(0);
    });

    it("bulkAssign returns error for unauthenticated users", async () => {
      const result = await bulkAssign(["id1"]);
      expect(result.error).toBeTruthy();
      expect(result.count).toBe(0);
    });

    it("getModerationStats returns null for unauthenticated users", async () => {
      const result = await getModerationStats();
      expect(result).toBeNull();
    });

    it("warnUser returns error for unauthenticated users", async () => {
      const result = await warnUser("user-1", "reason here");
      expect(result.error).toBeTruthy();
    });

    it("tempBanUser returns error for unauthenticated users", async () => {
      const result = await tempBanUser("user-1", "reason", 7);
      expect(result.error).toBeTruthy();
    });

    it("permanentBanUser returns error for unauthenticated users", async () => {
      const result = await permanentBanUser("user-1", "reason");
      expect(result.error).toBeTruthy();
    });

    it("liftBan returns error for unauthenticated users", async () => {
      const result = await liftBan("warn-1", "reason");
      expect(result.error).toBeTruthy();
    });

    it("reviewAppeal returns error for unauthenticated users", async () => {
      const result = await reviewAppeal(
        "appeal-1",
        "upheld",
        "Review note that is at least 10 chars",
      );
      expect(result.error).toBeTruthy();
    });

    it("listAppeals returns empty for unauthenticated users", async () => {
      const result = await listAppeals();
      expect(result).toEqual({ appeals: [], total: 0 });
    });

    it("promoteToGuardian returns error for unauthenticated users", async () => {
      const result = await promoteToGuardian("user-1");
      expect(result.error).toBeTruthy();
    });

    it("demoteFromGuardian returns error for unauthenticated users", async () => {
      const result = await demoteFromGuardian("user-1");
      expect(result.error).toBeTruthy();
    });

    it("verifyOrganiser returns error for unauthenticated users", async () => {
      const result = await verifyOrganiser("user-1");
      expect(result.error).toBeTruthy();
    });

    it("adminRecomputeTrustScore returns error for unauthenticated users", async () => {
      const result = await adminRecomputeTrustScore("user-1");
      expect(result.error).toBeTruthy();
    });
  });

  describe("Access Control — non-admin users rejected", () => {
    beforeEach(() => {
      mockRegularUser();
      setupNonAdminProfile();
    });

    it("listModerationQueue returns empty for non-admin", async () => {
      const result = await listModerationQueue();
      expect(result).toEqual({ items: [], total: 0 });
    });

    it("getModerationDetail returns null for non-admin", async () => {
      const result = await getModerationDetail("item-1");
      expect(result).toBeNull();
    });

    it("assignModerationItem returns error for non-admin", async () => {
      const result = await assignModerationItem("item-1");
      expect(result.error).toBeTruthy();
    });

    it("dismissModerationItem returns error for non-admin", async () => {
      const result = await dismissModerationItem("item-1", "test");
      expect(result.error).toBeTruthy();
    });

    it("actionModerationItem returns error for non-admin", async () => {
      const result = await actionModerationItem("item-1", "warn_user");
      expect(result.error).toBeTruthy();
    });

    it("bulkDismiss returns error for non-admin", async () => {
      const result = await bulkDismiss(["id1"]);
      expect(result.error).toBeTruthy();
      expect(result.count).toBe(0);
    });

    it("bulkAssign returns error for non-admin", async () => {
      const result = await bulkAssign(["id1"]);
      expect(result.error).toBeTruthy();
      expect(result.count).toBe(0);
    });

    it("getModerationStats returns null for non-admin", async () => {
      const result = await getModerationStats();
      expect(result).toBeNull();
    });

    it("warnUser returns error for non-admin", async () => {
      const result = await warnUser("user-1", "reason here");
      expect(result.error).toBeTruthy();
    });

    it("tempBanUser returns error for non-admin", async () => {
      const result = await tempBanUser("user-1", "reason", 7);
      expect(result.error).toBeTruthy();
    });

    it("permanentBanUser returns error for non-admin", async () => {
      const result = await permanentBanUser("user-1", "reason");
      expect(result.error).toBeTruthy();
    });

    it("liftBan returns error for non-admin", async () => {
      const result = await liftBan("warn-1", "reason");
      expect(result.error).toBeTruthy();
    });

    it("reviewAppeal returns error for non-admin", async () => {
      const result = await reviewAppeal(
        "appeal-1",
        "upheld",
        "Review note that is at least 10 chars",
      );
      expect(result.error).toBeTruthy();
    });

    it("listAppeals returns empty for non-admin", async () => {
      const result = await listAppeals();
      expect(result).toEqual({ appeals: [], total: 0 });
    });

    it("promoteToGuardian returns error for non-admin", async () => {
      const result = await promoteToGuardian("user-1");
      expect(result.error).toBeTruthy();
    });

    it("demoteFromGuardian returns error for non-admin", async () => {
      const result = await demoteFromGuardian("user-1");
      expect(result.error).toBeTruthy();
    });

    it("verifyOrganiser returns error for non-admin", async () => {
      const result = await verifyOrganiser("user-1");
      expect(result.error).toBeTruthy();
    });

    it("adminRecomputeTrustScore returns error for non-admin", async () => {
      const result = await adminRecomputeTrustScore("user-1");
      expect(result.error).toBeTruthy();
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // 2. SELF-PROTECTION — Cannot ban/warn admins or self
  // ════════════════════════════════════════════════════════════════════════

  describe("Self-Protection", () => {
    beforeEach(() => {
      mockAdmin();
    });

    it("warnUser rejects warning an admin user", async () => {
      const targetAdminId = "admin-target";
      let callCount = 0;
      mockListDocuments.mockImplementation(
        (_db: string, coll: string) => {
          callCount++;
          if (coll === "profiles") {
            // First call: admin auth lookup
            if (callCount === 1) {
              return Promise.resolve({
                total: 1,
                documents: [makeProfile()],
              });
            }
            // Second call: target profile lookup — also admin
            return Promise.resolve({
              total: 1,
              documents: [
                makeProfile({
                  userId: targetAdminId,
                  $id: "prof-target",
                  role: "admin",
                }),
              ],
            });
          }
          return Promise.resolve({ total: 0, documents: [] });
        },
      );

      const result = await warnUser(targetAdminId, "test warning");
      expect(result.error).toContain("admin");
    });

    it("tempBanUser rejects banning an admin user", async () => {
      const targetAdminId = "admin-target";
      let callCount = 0;
      mockListDocuments.mockImplementation(
        (_db: string, coll: string) => {
          callCount++;
          if (coll === "profiles") {
            if (callCount === 1) {
              return Promise.resolve({
                total: 1,
                documents: [makeProfile()],
              });
            }
            return Promise.resolve({
              total: 1,
              documents: [
                makeProfile({
                  userId: targetAdminId,
                  $id: "prof-target",
                  role: "admin",
                }),
              ],
            });
          }
          return Promise.resolve({ total: 0, documents: [] });
        },
      );

      const result = await tempBanUser(
        targetAdminId,
        "test ban",
        7,
      );
      expect(result.error).toContain("admin");
    });

    it("permanentBanUser rejects banning an admin user", async () => {
      const targetAdminId = "admin-target";
      let callCount = 0;
      mockListDocuments.mockImplementation(
        (_db: string, coll: string) => {
          callCount++;
          if (coll === "profiles") {
            if (callCount === 1) {
              return Promise.resolve({
                total: 1,
                documents: [makeProfile()],
              });
            }
            return Promise.resolve({
              total: 1,
              documents: [
                makeProfile({
                  userId: targetAdminId,
                  $id: "prof-target",
                  role: "admin",
                }),
              ],
            });
          }
          return Promise.resolve({ total: 0, documents: [] });
        },
      );

      const result = await permanentBanUser(targetAdminId, "test ban");
      expect(result.error).toContain("admin");
    });

    it("warnUser rejects warning yourself", async () => {
      let callCount = 0;
      mockListDocuments.mockImplementation(
        (_db: string, coll: string) => {
          callCount++;
          if (coll === "profiles") {
            if (callCount === 1) {
              return Promise.resolve({
                total: 1,
                documents: [makeProfile()],
              });
            }
            // Target = self (same userId as admin)
            return Promise.resolve({
              total: 1,
              documents: [makeProfile()],
            });
          }
          return Promise.resolve({ total: 0, documents: [] });
        },
      );

      const result = await warnUser(ADMIN_USER.$id, "self warning");
      expect(result.error).toContain("own account");
    });

    it("tempBanUser rejects banning yourself", async () => {
      let callCount = 0;
      mockListDocuments.mockImplementation(
        (_db: string, coll: string) => {
          callCount++;
          if (coll === "profiles") {
            if (callCount === 1) {
              return Promise.resolve({
                total: 1,
                documents: [makeProfile()],
              });
            }
            return Promise.resolve({
              total: 1,
              documents: [makeProfile()],
            });
          }
          return Promise.resolve({ total: 0, documents: [] });
        },
      );

      const result = await tempBanUser(ADMIN_USER.$id, "self ban", 7);
      expect(result.error).toContain("own account");
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // 3. INPUT VALIDATION — INJ-02
  // ════════════════════════════════════════════════════════════════════════

  describe("Input Validation", () => {
    it("submitReport rejects description > 500 chars", async () => {
      const longDesc = "x".repeat(501);
      const result = await submitReport("event", "evt-1", "spam", longDesc);
      expect(result.error).toBe("Invalid report data");
    });

    it("submitReport rejects invalid reason enum", async () => {
      const result = await submitReport(
        "event",
        "evt-1",
        "INVALID_REASON" as never,
      );
      expect(result.error).toBe("Invalid report data");
    });

    it("submitReport rejects invalid entity type", async () => {
      const result = await submitReport(
        "badtype" as never,
        "id-1",
        "spam",
      );
      expect(result.error).toBe("Invalid report data");
    });

    it("fileAppeal rejects reason < 10 chars", async () => {
      mockRegularUser();
      const result = await fileAppeal("mod-item-1", "short");
      expect(result.error).toBeTruthy();
    });

    it("fileAppeal rejects reason > 1000 chars", async () => {
      mockRegularUser();
      const result = await fileAppeal("mod-item-1", "x".repeat(1001));
      expect(result.error).toBeTruthy();
    });

    it("warnUser rejects reason > 1000 chars", async () => {
      const result = await warnUser("user-1", "x".repeat(1001));
      expect(result.error).toBeTruthy();
    });

    it("warnUser rejects empty reason", async () => {
      const result = await warnUser("user-1", "");
      expect(result.error).toBeTruthy();
    });

    it("tempBanUser rejects invalid duration (not 1/7/30)", async () => {
      mockAdmin();
      setupAdminProfile();

      // Need target profile as well — set up a second call
      let callCount = 0;
      mockListDocuments.mockImplementation(
        (_db: string, coll: string) => {
          callCount++;
          if (coll === "profiles") {
            if (callCount === 1) {
              return Promise.resolve({
                total: 1,
                documents: [makeProfile()],
              });
            }
            return Promise.resolve({
              total: 1,
              documents: [
                makeProfile({
                  userId: "target-user",
                  $id: "prof-target",
                  role: "attendee",
                }),
              ],
            });
          }
          return Promise.resolve({ total: 0, documents: [] });
        },
      );

      const result = await tempBanUser("target-user", "reason", 14);
      expect(result.error).toContain("Invalid ban duration");
    });

    it("tempBanUser rejects duration of 0", async () => {
      mockAdmin();
      setupAdminProfile();
      const result = await tempBanUser("target-user", "reason", 0);
      expect(result.error).toContain("Invalid ban duration");
    });

    it("actionModerationItem rejects unknown actionType", async () => {
      mockAdmin();
      setupAdminProfile();

      const result = await actionModerationItem(
        "item-1",
        "nuke_everything",
      );
      expect(result.error).toBe("Invalid action type");
    });

    it("addModerationNote rejects body > 5000 chars", async () => {
      mockAdmin();
      setupAdminProfile();

      const result = await addModerationNote("item-1", "x".repeat(5001));
      expect(result.error).toBeTruthy();
    });

    it("addModerationNote rejects empty body", async () => {
      mockAdmin();
      setupAdminProfile();

      const result = await addModerationNote("item-1", "");
      expect(result.error).toBeTruthy();
    });

    it("bulkDismiss rejects > 50 items", async () => {
      mockAdmin();
      setupAdminProfile();

      const ids = Array.from({ length: 51 }, (_, i) => `item-${i}`);
      const result = await bulkDismiss(ids);
      expect(result.error).toBeTruthy();
      expect(result.count).toBe(0);
    });

    it("bulkDismiss rejects empty array", async () => {
      mockAdmin();
      setupAdminProfile();

      const result = await bulkDismiss([]);
      expect(result.error).toBeTruthy();
      expect(result.count).toBe(0);
    });

    it("bulkAssign rejects > 50 items", async () => {
      mockAdmin();
      setupAdminProfile();

      const ids = Array.from({ length: 51 }, (_, i) => `item-${i}`);
      const result = await bulkAssign(ids);
      expect(result.error).toBeTruthy();
      expect(result.count).toBe(0);
    });

    it("getEventRatings caps limit at 100", async () => {
      // getEventRatings is public, no auth needed
      mockListDocuments.mockResolvedValue({
        total: 0,
        documents: [],
      });

      await getEventRatings("evt-1", 1, 999);

      // Verify the limit query used 100 (capped), not 999
      const calls = mockListDocuments.mock.calls;
      const lastCall = calls[calls.length - 1];
      const queries = lastCall[2] as string[];
      const limitQuery = queries.find((q: string) => q.includes('"type":"limit"'));
      expect(limitQuery).toBeDefined();
      const parsed = JSON.parse(limitQuery!);
      expect(parsed.n).toBeLessThanOrEqual(100);
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // 4. RATE LIMITING
  // ════════════════════════════════════════════════════════════════════════

  describe("Rate Limiting", () => {
    it("submitReport rejects after 10 reports in 24 hours", async () => {
      mockRegularUser();

      let callCount = 0;
      mockListDocuments.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Rate limit check: 10 reports already
          return Promise.resolve({ total: 10, documents: [] });
        }
        return Promise.resolve({ total: 0, documents: [] });
      });

      const result = await submitReport("event", "evt-1", "spam");
      expect(result.error).toContain("maximum number of reports");
    });

    it("submitReport rejects duplicate report on same entity", async () => {
      mockRegularUser();

      let callCount = 0;
      mockListDocuments.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Rate limit check: under limit
          return Promise.resolve({ total: 2, documents: [] });
        }
        if (callCount === 2) {
          // Duplicate check: found existing report
          return Promise.resolve({ total: 1, documents: [{}] });
        }
        return Promise.resolve({ total: 0, documents: [] });
      });

      const result = await submitReport("event", "evt-1", "spam");
      expect(result.error).toContain("already reported");
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // 5. APPEAL FAIRNESS
  // ════════════════════════════════════════════════════════════════════════

  describe("Appeal Fairness", () => {
    it("reviewAppeal rejects when reviewer is same as original moderator", async () => {
      mockAdmin();

      let callCount = 0;
      mockListDocuments.mockImplementation(
        (_db: string, coll: string) => {
          callCount++;
          if (coll === "profiles") {
            return Promise.resolve({
              total: 1,
              documents: [makeProfile()],
            });
          }
          return Promise.resolve({ total: 0, documents: [] });
        },
      );

      // Appeal doc
      mockGetDocument.mockImplementation(
        (_db: string, coll: string, docId: string) => {
          if (coll === "appeals") {
            return Promise.resolve({
              $id: "appeal-1",
              moderationItemId: "mod-item-1",
              appealerId: "user-123",
              status: "pending",
            });
          }
          if (coll === "moderation-items") {
            return Promise.resolve({
              $id: "mod-item-1",
              entityType: "event",
              entityId: "evt-1",
              status: "actioned",
              resolvedBy: ADMIN_USER.$id, // Same admin is the reviewer
              actionTaken: "warn_user",
            });
          }
          return Promise.reject(new Error("Not found"));
        },
      );

      const result = await reviewAppeal(
        "appeal-1",
        "upheld",
        "I reviewed this and it was fair",
      );
      expect(result.error).toContain("cannot review this appeal");
    });

    it("fileAppeal rejects after 30-day window for non-permanent bans", async () => {
      mockRegularUser();

      const oldResolvedDate = new Date(
        Date.now() - 31 * 24 * 60 * 60 * 1000,
      ).toISOString();

      mockListDocuments.mockResolvedValue({
        total: 0,
        documents: [],
      });

      mockGetDocument.mockImplementation(
        (_db: string, coll: string) => {
          if (coll === "moderation-items") {
            return Promise.resolve({
              $id: "mod-item-1",
              entityType: "user",
              entityId: REGULAR_USER.$id,
              status: "actioned",
              resolvedAt: oldResolvedDate,
              actionTaken: "warn_user",
            });
          }
          return Promise.reject(new Error("Not found"));
        },
      );

      const result = await fileAppeal(
        "mod-item-1",
        "This is my appeal reason for the moderation action",
      );
      expect(result.error).toContain("expired");
    });

    it("fileAppeal allows 90-day window for permanent bans", async () => {
      mockRegularUser();

      // 60 days ago — past 30 days but within 90 days
      const resolvedDate = new Date(
        Date.now() - 60 * 24 * 60 * 60 * 1000,
      ).toISOString();

      // Appeal existence check: no existing appeal
      mockListDocuments.mockResolvedValue({
        total: 0,
        documents: [],
      });

      mockGetDocument.mockImplementation(
        (_db: string, coll: string) => {
          if (coll === "moderation-items") {
            return Promise.resolve({
              $id: "mod-item-1",
              entityType: "user",
              entityId: REGULAR_USER.$id,
              status: "actioned",
              resolvedAt: resolvedDate,
              actionTaken: "permanent_ban",
            });
          }
          return Promise.reject(new Error("Not found"));
        },
      );

      mockCreateDocument.mockResolvedValue({ $id: "appeal-new" });

      const result = await fileAppeal(
        "mod-item-1",
        "I believe this permanent ban was unjust and here is why",
      );
      // Should NOT get "expired" error — the 90-day window is still open
      // result.error is either undefined (success) or a string without "expired"
      if (result.error) {
        expect(result.error).not.toContain("expired");
      } else {
        // No error means the appeal went through (or succeeded)
        expect(result.error).toBeUndefined();
      }
    });

    it("fileAppeal rejects when user is not the affected party", async () => {
      mockRegularUser("different-user");

      mockListDocuments.mockResolvedValue({
        total: 0,
        documents: [],
      });

      mockGetDocument.mockImplementation(
        (_db: string, coll: string) => {
          if (coll === "moderation-items") {
            return Promise.resolve({
              $id: "mod-item-1",
              entityType: "user",
              entityId: "some-other-user", // Different from the authenticated user
              status: "actioned",
              resolvedAt: new Date().toISOString(),
              actionTaken: "warn_user",
            });
          }
          return Promise.reject(new Error("Not found"));
        },
      );

      const result = await fileAppeal(
        "mod-item-1",
        "Appealing on behalf of someone else should fail",
      );
      expect(result.error).toContain("only appeal actions taken against you");
    });

    it("fileAppeal rejects duplicate appeal", async () => {
      mockRegularUser();

      mockGetDocument.mockImplementation(
        (_db: string, coll: string) => {
          if (coll === "moderation-items") {
            return Promise.resolve({
              $id: "mod-item-1",
              entityType: "user",
              entityId: REGULAR_USER.$id,
              status: "actioned",
              resolvedAt: new Date().toISOString(),
              actionTaken: "warn_user",
            });
          }
          return Promise.reject(new Error("Not found"));
        },
      );

      // Existing appeal found
      mockListDocuments.mockResolvedValue({
        total: 1,
        documents: [{ $id: "existing-appeal" }],
      });

      const result = await fileAppeal(
        "mod-item-1",
        "I want to appeal again but should not be able to",
      );
      expect(result.error).toContain("already been filed");
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // 6. TRUST SCORE SAFETY
  // ════════════════════════════════════════════════════════════════════════

  describe("Trust Score Safety", () => {
    it("getOrganiserTrustData is read-only (does not write to DB)", async () => {
      mockListDocuments.mockResolvedValue({
        total: 1,
        documents: [
          makeProfile({
            userId: "org-1",
            trustScore: 85,
            isVerified: true,
          }),
        ],
      });

      const result = await getOrganiserTrustData("org-1");
      expect(result).toEqual({ trustScore: 85, isVerified: true });
      // No writes should have occurred
      expect(mockCreateDocument).not.toHaveBeenCalled();
      expect(mockUpdateDocument).not.toHaveBeenCalled();
    });

    it("adminRecomputeTrustScore requires admin auth", async () => {
      mockUnauthenticated();
      const result = await adminRecomputeTrustScore("org-1");
      expect(result.error).toBeTruthy();
    });

    it("computeTrustScore never returns negative", () => {
      const result = computeTrustScore({
        completedEvents: 0,
        totalNonDraftEvents: 100,
        averageRating: 0,
        totalRatings: 100,
        refundedOrders: 100,
        totalOrders: 100,
        accountAgeDays: 0,
        medianResponseTimeHours: 9999,
        warningCount: 100,
        banCount: 100,
      });
      expect(result.total).toBeGreaterThanOrEqual(0);
    });

    it("computeTrustScore never exceeds 100", () => {
      const result = computeTrustScore({
        completedEvents: 1000,
        totalNonDraftEvents: 1000,
        averageRating: 5,
        totalRatings: 10000,
        refundedOrders: 0,
        totalOrders: 10000,
        accountAgeDays: 9999,
        medianResponseTimeHours: 1,
        warningCount: 0,
        banCount: 0,
      });
      expect(result.total).toBeLessThanOrEqual(100);
    });

    it("computeTrustScore handles all-zero input gracefully", () => {
      const result = computeTrustScore({
        completedEvents: 0,
        totalNonDraftEvents: 0,
        averageRating: 0,
        totalRatings: 0,
        refundedOrders: 0,
        totalOrders: 0,
        accountAgeDays: 0,
        medianResponseTimeHours: 0,
        warningCount: 0,
        banCount: 0,
      });
      expect(result.total).toBeGreaterThanOrEqual(0);
      expect(result.total).toBeLessThanOrEqual(100);
      expect(Number.isFinite(result.total)).toBe(true);
    });

    it("computeTrustScore handles negative inputs safely", () => {
      const result = computeTrustScore({
        completedEvents: -5,
        totalNonDraftEvents: -10,
        averageRating: -3,
        totalRatings: -50,
        refundedOrders: -5,
        totalOrders: -10,
        accountAgeDays: -100,
        medianResponseTimeHours: -24,
        warningCount: -5,
        banCount: -3,
      });
      expect(result.total).toBeGreaterThanOrEqual(0);
      expect(result.total).toBeLessThanOrEqual(100);
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // 7. BAN ENFORCEMENT
  // ════════════════════════════════════════════════════════════════════════

  describe("Ban Enforcement", () => {
    it("autoLiftExpiredBan clears expired temp bans", async () => {
      const expiredDate = new Date(
        Date.now() - 1000 * 60 * 60, // 1 hour ago
      ).toISOString();

      const profile = makeProfile({
        userId: "banned-user",
        banLevel: "temp_banned",
        banExpiresAt: expiredDate,
      }) as never;

      mockListDocuments.mockResolvedValue({
        total: 1,
        documents: [profile],
      });
      mockUpdateDocument.mockResolvedValue({});

      const result = await autoLiftExpiredBan(profile);
      expect(result).toBe(true);
      expect(mockUpdateDocument).toHaveBeenCalledWith(
        "riffoff",
        "profiles",
        expect.any(String),
        expect.objectContaining({
          banLevel: "none",
          banExpiresAt: null,
        }),
      );
    });

    it("autoLiftExpiredBan does NOT clear non-expired bans", async () => {
      const futureDate = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days from now
      ).toISOString();

      const profile = makeProfile({
        userId: "banned-user",
        banLevel: "temp_banned",
        banExpiresAt: futureDate,
      }) as never;

      const result = await autoLiftExpiredBan(profile);
      expect(result).toBe(false);
      expect(mockUpdateDocument).not.toHaveBeenCalled();
    });

    it("autoLiftExpiredBan does NOT clear permanent bans", async () => {
      const profile = makeProfile({
        userId: "banned-user",
        banLevel: "permanent_banned",
        banExpiresAt: null,
      }) as never;

      const result = await autoLiftExpiredBan(profile);
      expect(result).toBe(false);
      expect(mockUpdateDocument).not.toHaveBeenCalled();
    });

    it("autoLiftExpiredBan creates audit log on lift", async () => {
      const expiredDate = new Date(
        Date.now() - 1000 * 60 * 60,
      ).toISOString();

      const profile = makeProfile({
        userId: "banned-user",
        banLevel: "temp_banned",
        banExpiresAt: expiredDate,
        $id: "prof-banned",
      }) as never;

      mockListDocuments.mockResolvedValue({
        total: 1,
        documents: [profile],
      });
      mockUpdateDocument.mockResolvedValue({});

      await autoLiftExpiredBan(profile);

      expect(createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "system.ban_auto_lifted",
          entityType: "profile",
        }),
      );
    });

    it("autoLiftExpiredBan returns false when profile not found in DB", async () => {
      const expiredDate = new Date(
        Date.now() - 1000 * 60 * 60,
      ).toISOString();

      const profile = makeProfile({
        userId: "ghost-user",
        banLevel: "temp_banned",
        banExpiresAt: expiredDate,
      }) as never;

      // getTargetProfile returns null
      mockListDocuments.mockResolvedValue({
        total: 0,
        documents: [],
      });

      const result = await autoLiftExpiredBan(profile);
      expect(result).toBe(false);
    });
  });
});
