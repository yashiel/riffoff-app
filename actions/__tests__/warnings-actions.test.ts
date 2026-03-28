import { vi, describe, it, expect, beforeEach } from "vitest";

// ─── Mocks ──────────────────────────────────────────────────

const mockListDocuments = vi.fn();
const mockGetDocument = vi.fn();
const mockCreateDocument = vi.fn();
const mockUpdateDocument = vi.fn();
const mockAccountGet = vi.fn();
const mockCreateNotification = vi.fn();

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
vi.mock("@/actions/notifications", () => ({
  createNotification: (...args: unknown[]) => mockCreateNotification(...args),
}));
vi.mock("@/lib/utils", () => ({
  serialize: <T>(data: T): T => JSON.parse(JSON.stringify(data)),
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
    orderDesc: (field: string) => JSON.stringify({ type: "orderDesc", field }),
    contains: (field: string, value: unknown) =>
      JSON.stringify({ type: "contains", field, value }),
    isNull: (field: string) => JSON.stringify({ type: "isNull", field }),
  },
}));

// ─── Imports (after mocks) ──────────────────────────────────

import { createSessionClient } from "@/lib/appwrite/server";
import {
  warnUser,
  tempBanUser,
  permanentBanUser,
  liftBan,
  autoLiftExpiredBan,
} from "@/actions/warnings";
import type { ProfileDoc } from "@/lib/appwrite/types";

// ─── Helpers ────────────────────────────────────────────────

const ADMIN_USER = { $id: "admin-001", name: "Admin" };
const TARGET_USER_ID = "user-target-001";

const ADMIN_PROFILE = {
  $id: "prof-admin",
  userId: ADMIN_USER.$id,
  role: "admin",
  displayName: "Admin User",
  communityRole: "member",
  warningCount: 0,
  banLevel: "none",
};

const TARGET_PROFILE = {
  $id: "prof-target",
  userId: TARGET_USER_ID,
  role: "attendee",
  displayName: "Target User",
  communityRole: "member",
  warningCount: 0,
  banLevel: "none",
};

const TARGET_ADMIN_PROFILE = {
  ...TARGET_PROFILE,
  $id: "prof-target-admin",
  userId: "admin-target-002",
  role: "admin",
  displayName: "Other Admin",
};

/**
 * Sets up admin authentication then routes listDocuments calls based on
 * collection and call sequence for each test's needs.
 */
function mockAdminAuthWithTargetProfile(
  targetProfile: Record<string, unknown> = TARGET_PROFILE,
) {
  mockAccountGet.mockResolvedValue(ADMIN_USER);

  let profileCallCount = 0;
  mockListDocuments.mockImplementation((_db: string, coll: string) => {
    if (coll === "profiles") {
      profileCallCount++;
      // First profile call: requireAdmin checks admin's own profile
      if (profileCallCount === 1) {
        return Promise.resolve({
          total: 1,
          documents: [ADMIN_PROFILE],
        });
      }
      // Second profile call: getTargetProfile
      return Promise.resolve({
        total: 1,
        documents: [targetProfile],
      });
    }
    return Promise.resolve({ total: 0, documents: [] });
  });
}

// ─── Tests ──────────────────────────────────────────────────

describe("warnUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires admin", async () => {
    vi.mocked(createSessionClient).mockResolvedValueOnce(null as never);

    const result = await warnUser(TARGET_USER_ID, "Spamming events");
    expect(result.error).toBe("Admin access required");
  });

  it("cannot warn admin users", async () => {
    mockAdminAuthWithTargetProfile(TARGET_ADMIN_PROFILE);

    const result = await warnUser("admin-target-002", "Some reason");
    expect(result.error).toBe(
      "Cannot issue warnings or bans against admin users",
    );
  });

  it("cannot warn yourself", async () => {
    mockAdminAuthWithTargetProfile({
      ...TARGET_PROFILE,
      userId: ADMIN_USER.$id,
    });

    const result = await warnUser(ADMIN_USER.$id, "Self warning");
    expect(result.error).toBe(
      "Cannot issue warnings or bans against your own account",
    );
  });

  it("creates warning doc, updates profile, sends notification", async () => {
    mockAdminAuthWithTargetProfile();
    mockCreateDocument.mockResolvedValue({ $id: "warning-1" });
    mockUpdateDocument.mockResolvedValue({});
    mockCreateNotification.mockResolvedValue({});

    const result = await warnUser(TARGET_USER_ID, "Spamming events", "mod-1");
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();

    // Creates warning document
    expect(mockCreateDocument).toHaveBeenCalledWith(
      "riffoff",
      "user-warnings",
      "mock-unique-id",
      expect.objectContaining({
        userId: TARGET_USER_ID,
        level: "warning",
        reason: "Spamming events",
        issuedBy: ADMIN_USER.$id,
        moderationItemId: "mod-1",
      }),
    );

    // Updates profile
    expect(mockUpdateDocument).toHaveBeenCalledWith(
      "riffoff",
      "profiles",
      TARGET_PROFILE.$id,
      expect.objectContaining({
        warningCount: 1,
        banLevel: "warned",
      }),
    );

    // Sends notification
    expect(mockCreateNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: TARGET_USER_ID,
        type: "moderation_warning",
      }),
    );
  });

  it("increments warningCount from existing value", async () => {
    const profileWith2Warnings = {
      ...TARGET_PROFILE,
      warningCount: 2,
    };
    mockAdminAuthWithTargetProfile(profileWith2Warnings);
    mockCreateDocument.mockResolvedValue({ $id: "warning-2" });
    mockUpdateDocument.mockResolvedValue({});
    mockCreateNotification.mockResolvedValue({});

    const result = await warnUser(TARGET_USER_ID, "Another warning");
    expect(result.success).toBe(true);

    expect(mockUpdateDocument).toHaveBeenCalledWith(
      "riffoff",
      "profiles",
      TARGET_PROFILE.$id,
      expect.objectContaining({ warningCount: 3 }),
    );
  });
});

describe("tempBanUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires admin", async () => {
    vi.mocked(createSessionClient).mockResolvedValueOnce(null as never);

    const result = await tempBanUser(TARGET_USER_ID, "Bad behavior", 7);
    expect(result.error).toBe("Admin access required");
  });

  it("rejects invalid duration (only 1, 7, 30 allowed)", async () => {
    mockAdminAuthWithTargetProfile();

    const result = await tempBanUser(TARGET_USER_ID, "Bad behavior", 14);
    expect(result.error).toBe("Invalid ban duration. Allowed: 1, 7, or 30 days");
  });

  it("sets banLevel to 'temp_banned' with correct expiresAt", async () => {
    mockAdminAuthWithTargetProfile();
    mockCreateDocument.mockResolvedValue({ $id: "warning-ban" });
    mockUpdateDocument.mockResolvedValue({});
    mockCreateNotification.mockResolvedValue({});

    const before = Date.now();
    const result = await tempBanUser(TARGET_USER_ID, "Harassment", 7);
    const after = Date.now();

    expect(result.success).toBe(true);

    // Verify profile update with temp_banned
    const profileUpdateCall = mockUpdateDocument.mock.calls.find(
      (c: unknown[]) => c[1] === "profiles",
    );
    expect(profileUpdateCall).toBeDefined();
    expect(profileUpdateCall![3]).toMatchObject({
      banLevel: "temp_banned",
      warningCount: 1,
    });

    // Verify expiresAt is ~7 days in the future
    const expiresAt = new Date(profileUpdateCall![3].banExpiresAt).getTime();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    expect(expiresAt).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
    expect(expiresAt).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
  });

  it("suspends all published events by the user", async () => {
    mockAdminAuthWithTargetProfile();
    mockCreateDocument.mockResolvedValue({ $id: "warning-ban" });
    mockUpdateDocument.mockResolvedValue({});
    mockCreateNotification.mockResolvedValue({});

    // Override listDocuments to return published events for the event query
    let profileCallCount = 0;
    mockListDocuments.mockImplementation((_db: string, coll: string) => {
      if (coll === "profiles") {
        profileCallCount++;
        if (profileCallCount === 1) {
          return Promise.resolve({ total: 1, documents: [ADMIN_PROFILE] });
        }
        return Promise.resolve({ total: 1, documents: [TARGET_PROFILE] });
      }
      if (coll === "events") {
        return Promise.resolve({
          total: 2,
          documents: [
            { $id: "evt-1", status: "published" },
            { $id: "evt-2", status: "published" },
          ],
        });
      }
      return Promise.resolve({ total: 0, documents: [] });
    });

    const result = await tempBanUser(TARGET_USER_ID, "Harassment", 1);
    expect(result.success).toBe(true);

    // Verify each published event was suspended
    const eventUpdates = mockUpdateDocument.mock.calls.filter(
      (c: unknown[]) => c[1] === "events",
    );
    expect(eventUpdates).toHaveLength(2);
    expect(eventUpdates[0][3]).toEqual({ status: "suspended" });
    expect(eventUpdates[1][3]).toEqual({ status: "suspended" });
  });
});

describe("permanentBanUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires admin", async () => {
    vi.mocked(createSessionClient).mockResolvedValueOnce(null as never);

    const result = await permanentBanUser(TARGET_USER_ID, "Fraud");
    expect(result.error).toBe("Admin access required");
  });

  it("sets banLevel to 'permanent_banned'", async () => {
    mockAdminAuthWithTargetProfile();
    mockCreateDocument.mockResolvedValue({ $id: "warning-perma" });
    mockUpdateDocument.mockResolvedValue({});
    mockCreateNotification.mockResolvedValue({});

    const result = await permanentBanUser(TARGET_USER_ID, "Repeated fraud");
    expect(result.success).toBe(true);

    const profileUpdate = mockUpdateDocument.mock.calls.find(
      (c: unknown[]) => c[1] === "profiles",
    );
    expect(profileUpdate![3]).toMatchObject({
      banLevel: "permanent_banned",
    });
  });

  it("cancels all events", async () => {
    mockAdminAuthWithTargetProfile();
    mockCreateDocument.mockResolvedValue({ $id: "warning-perma" });
    mockUpdateDocument.mockResolvedValue({});
    mockCreateNotification.mockResolvedValue({});

    let profileCallCount = 0;
    mockListDocuments.mockImplementation((_db: string, coll: string) => {
      if (coll === "profiles") {
        profileCallCount++;
        if (profileCallCount === 1) {
          return Promise.resolve({ total: 1, documents: [ADMIN_PROFILE] });
        }
        return Promise.resolve({ total: 1, documents: [TARGET_PROFILE] });
      }
      if (coll === "events") {
        return Promise.resolve({
          total: 2,
          documents: [
            { $id: "evt-1", status: "published" },
            { $id: "evt-2", status: "suspended" },
          ],
        });
      }
      if (coll === "tickets") {
        return Promise.resolve({ total: 0, documents: [] });
      }
      return Promise.resolve({ total: 0, documents: [] });
    });

    const result = await permanentBanUser(TARGET_USER_ID, "Fraud");
    expect(result.success).toBe(true);

    const eventUpdates = mockUpdateDocument.mock.calls.filter(
      (c: unknown[]) => c[1] === "events",
    );
    expect(eventUpdates).toHaveLength(2);
    for (const call of eventUpdates) {
      expect(call[3]).toEqual({ status: "cancelled" });
    }
  });

  it("voids all active tickets", async () => {
    mockAdminAuthWithTargetProfile();
    mockCreateDocument.mockResolvedValue({ $id: "warning-perma" });
    mockUpdateDocument.mockResolvedValue({});
    mockCreateNotification.mockResolvedValue({});

    let profileCallCount = 0;
    mockListDocuments.mockImplementation((_db: string, coll: string) => {
      if (coll === "profiles") {
        profileCallCount++;
        if (profileCallCount === 1) {
          return Promise.resolve({ total: 1, documents: [ADMIN_PROFILE] });
        }
        return Promise.resolve({ total: 1, documents: [TARGET_PROFILE] });
      }
      if (coll === "events") {
        return Promise.resolve({ total: 0, documents: [] });
      }
      if (coll === "tickets") {
        return Promise.resolve({
          total: 2,
          documents: [
            { $id: "tkt-1", status: "active" },
            { $id: "tkt-2", status: "active" },
          ],
        });
      }
      return Promise.resolve({ total: 0, documents: [] });
    });

    const result = await permanentBanUser(TARGET_USER_ID, "Fraud");
    expect(result.success).toBe(true);

    const ticketUpdates = mockUpdateDocument.mock.calls.filter(
      (c: unknown[]) => c[1] === "tickets",
    );
    expect(ticketUpdates).toHaveLength(2);
    for (const call of ticketUpdates) {
      expect(call[3]).toEqual({ status: "void" });
    }
  });
});

describe("liftBan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires admin", async () => {
    vi.mocked(createSessionClient).mockResolvedValueOnce(null as never);

    const result = await liftBan("warning-1", "Appealed successfully");
    expect(result.error).toBe("Admin access required");
  });

  it("sets liftedAt and liftedBy", async () => {
    mockAccountGet.mockResolvedValue(ADMIN_USER);

    // requireAdmin profile lookup
    let profileCallCount = 0;
    mockListDocuments.mockImplementation((_db: string, coll: string) => {
      if (coll === "profiles") {
        profileCallCount++;
        if (profileCallCount === 1) {
          return Promise.resolve({ total: 1, documents: [ADMIN_PROFILE] });
        }
        // getTargetProfile for ban lift
        return Promise.resolve({ total: 1, documents: [TARGET_PROFILE] });
      }
      if (coll === "user-warnings") {
        // Remaining warnings query (none remaining)
        return Promise.resolve({ total: 0, documents: [] });
      }
      return Promise.resolve({ total: 0, documents: [] });
    });

    mockGetDocument.mockResolvedValue({
      $id: "warning-ban-1",
      userId: TARGET_USER_ID,
      level: "temp_ban",
      liftedAt: null,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    });
    mockUpdateDocument.mockResolvedValue({});

    const result = await liftBan("warning-ban-1", "User appealed");
    expect(result.success).toBe(true);

    // Check liftedAt and liftedBy on the warning document
    const warningUpdate = mockUpdateDocument.mock.calls.find(
      (c: unknown[]) => c[1] === "user-warnings",
    );
    expect(warningUpdate).toBeDefined();
    expect(warningUpdate![3]).toMatchObject({
      liftedBy: ADMIN_USER.$id,
    });
    expect(warningUpdate![3].liftedAt).toBeDefined();
  });

  it("determines correct new banLevel from remaining warnings", async () => {
    mockAccountGet.mockResolvedValue(ADMIN_USER);

    let profileCallCount = 0;
    mockListDocuments.mockImplementation((_db: string, coll: string) => {
      if (coll === "profiles") {
        profileCallCount++;
        if (profileCallCount === 1) {
          return Promise.resolve({ total: 1, documents: [ADMIN_PROFILE] });
        }
        return Promise.resolve({ total: 1, documents: [TARGET_PROFILE] });
      }
      if (coll === "user-warnings") {
        // Remaining: there's still a warning (not a ban)
        return Promise.resolve({
          total: 1,
          documents: [
            {
              $id: "warning-old",
              userId: TARGET_USER_ID,
              level: "warning",
              liftedAt: null,
              expiresAt: null,
            },
          ],
        });
      }
      return Promise.resolve({ total: 0, documents: [] });
    });

    mockGetDocument.mockResolvedValue({
      $id: "warning-ban-2",
      userId: TARGET_USER_ID,
      level: "temp_ban",
      liftedAt: null,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    });
    mockUpdateDocument.mockResolvedValue({});

    const result = await liftBan("warning-ban-2", "Appeal granted");
    expect(result.success).toBe(true);

    // Profile should be set to "warned" since there's still a warning remaining
    const profileUpdate = mockUpdateDocument.mock.calls.find(
      (c: unknown[]) => c[1] === "profiles",
    );
    expect(profileUpdate![3]).toMatchObject({
      banLevel: "warned",
      banExpiresAt: null,
    });
  });
});

describe("autoLiftExpiredBan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true and clears ban when expired", async () => {
    mockListDocuments.mockResolvedValue({
      total: 1,
      documents: [TARGET_PROFILE],
    });
    mockUpdateDocument.mockResolvedValue({});

    const profile = {
      ...TARGET_PROFILE,
      banLevel: "temp_banned",
      banExpiresAt: new Date(Date.now() - 60000).toISOString(), // expired 1 minute ago
    } as unknown as ProfileDoc;

    const result = await autoLiftExpiredBan(profile);
    expect(result).toBe(true);

    expect(mockUpdateDocument).toHaveBeenCalledWith(
      "riffoff",
      "profiles",
      TARGET_PROFILE.$id,
      { banLevel: "none", banExpiresAt: null },
    );
  });

  it("returns false when ban not expired", async () => {
    const profile = {
      ...TARGET_PROFILE,
      banLevel: "temp_banned",
      banExpiresAt: new Date(Date.now() + 86400000).toISOString(), // expires tomorrow
    } as unknown as ProfileDoc;

    const result = await autoLiftExpiredBan(profile);
    expect(result).toBe(false);
    expect(mockUpdateDocument).not.toHaveBeenCalled();
  });

  it("returns false when no ban", async () => {
    const profile = {
      ...TARGET_PROFILE,
      banLevel: "none",
      banExpiresAt: null,
    } as unknown as ProfileDoc;

    const result = await autoLiftExpiredBan(profile);
    expect(result).toBe(false);
    expect(mockUpdateDocument).not.toHaveBeenCalled();
  });
});
