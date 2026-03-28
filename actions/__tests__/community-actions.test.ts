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

// ─── Constants ──────────────────────────────────────

const ADMIN_ID = "admin-001";
const TARGET_USER_ID = "user-target";

// ─── Helpers ────────────────────────────────────────

function mockUnauthenticated() {
  _sessionClientOverride = null;
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

function makeProfile(overrides: Record<string, unknown> = {}) {
  return {
    $id: "prof-target",
    userId: TARGET_USER_ID,
    role: "attendee",
    communityRole: "member",
    displayName: "Test User",
    totalEventsAttended: 15,
    warningCount: 0,
    $createdAt: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

// ─── Import SUT ─────────────────────────────────────

import {
  promoteToGuardian,
  demoteFromGuardian,
  checkGuardianEligibility,
  getGuardianCandidates,
} from "../community";

// ─── promoteToGuardian ──────────────────────────────

describe("promoteToGuardian", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires admin", async () => {
    mockUnauthenticated();
    const result = await promoteToGuardian(TARGET_USER_ID);
    expect(result).toEqual({ error: "Unauthorized" });
  });

  it("cannot promote admin users", async () => {
    mockAdminAuth();
    mockListDocuments.mockResolvedValueOnce({
      documents: [makeProfile({ role: "admin" })],
      total: 1,
    });

    const result = await promoteToGuardian(TARGET_USER_ID);
    expect(result).toEqual({ error: "Only attendees can be promoted to guardian" });
  });

  it("cannot promote organiser users", async () => {
    mockAdminAuth();
    mockListDocuments.mockResolvedValueOnce({
      documents: [makeProfile({ role: "organiser" })],
      total: 1,
    });

    const result = await promoteToGuardian(TARGET_USER_ID);
    expect(result).toEqual({ error: "Only attendees can be promoted to guardian" });
  });

  it("returns error if user already a guardian", async () => {
    mockAdminAuth();
    mockListDocuments.mockResolvedValueOnce({
      documents: [makeProfile({ communityRole: "guardian" })],
      total: 1,
    });

    const result = await promoteToGuardian(TARGET_USER_ID);
    expect(result).toEqual({ error: "User is already a guardian" });
  });

  it("sets communityRole to guardian and sends notification", async () => {
    mockAdminAuth();
    mockListDocuments.mockResolvedValueOnce({
      documents: [makeProfile()],
      total: 1,
    });
    mockUpdateDocument.mockResolvedValueOnce({});

    const result = await promoteToGuardian(TARGET_USER_ID);
    expect(result).toEqual({});

    expect(mockUpdateDocument).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      "prof-target",
      { communityRole: "guardian" },
    );
  });

  it("returns error when user not found", async () => {
    mockAdminAuth();
    mockListDocuments.mockResolvedValueOnce({ documents: [], total: 0 });

    const result = await promoteToGuardian(TARGET_USER_ID);
    expect(result).toEqual({ error: "User not found" });
  });
});

// ─── demoteFromGuardian ─────────────────────────────

describe("demoteFromGuardian", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires admin", async () => {
    mockUnauthenticated();
    const result = await demoteFromGuardian(TARGET_USER_ID);
    expect(result).toEqual({ error: "Unauthorized" });
  });

  it("sets communityRole back to member", async () => {
    mockAdminAuth();
    mockListDocuments.mockResolvedValueOnce({
      documents: [makeProfile({ communityRole: "guardian" })],
      total: 1,
    });
    mockUpdateDocument.mockResolvedValueOnce({});

    const result = await demoteFromGuardian(TARGET_USER_ID);
    expect(result).toEqual({});
    expect(mockUpdateDocument).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      "prof-target",
      { communityRole: "member" },
    );
  });

  it("returns error when user is not a guardian", async () => {
    mockAdminAuth();
    mockListDocuments.mockResolvedValueOnce({
      documents: [makeProfile({ communityRole: "member" })],
      total: 1,
    });

    const result = await demoteFromGuardian(TARGET_USER_ID);
    expect(result).toEqual({ error: "User is not a guardian" });
  });
});

// ─── checkGuardianEligibility ───────────────────────

describe("checkGuardianEligibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires admin", async () => {
    mockUnauthenticated();
    const result = await checkGuardianEligibility(TARGET_USER_ID);
    expect(result).toEqual({ error: "Unauthorized" });
  });

  it("returns eligible=true when all criteria met", async () => {
    mockAdminAuth();
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 200);
    mockListDocuments.mockResolvedValueOnce({
      documents: [
        makeProfile({
          $createdAt: oldDate.toISOString(),
          totalEventsAttended: 15,
          warningCount: 0,
        }),
      ],
      total: 1,
    });
    // Actioned reports check — returns total: 5
    mockListDocuments.mockResolvedValueOnce({ documents: [], total: 5 });

    const result = await checkGuardianEligibility(TARGET_USER_ID);
    expect("eligible" in result && result.eligible).toBe(true);
  });

  it("returns eligible=false with per-criterion breakdown when not met", async () => {
    mockAdminAuth();
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 30);
    mockListDocuments.mockResolvedValueOnce({
      documents: [
        makeProfile({
          $createdAt: recentDate.toISOString(),
          totalEventsAttended: 3,
          warningCount: 2,
        }),
      ],
      total: 1,
    });
    // Actioned reports — only 1
    mockListDocuments.mockResolvedValueOnce({ documents: [], total: 1 });

    const result = await checkGuardianEligibility(TARGET_USER_ID);
    expect("eligible" in result).toBe(true);
    if ("eligible" in result) {
      expect(result.eligible).toBe(false);
      expect(result.criteria.accountAge.met).toBe(false);
      expect(result.criteria.eventsAttended.met).toBe(false);
      expect(result.criteria.actionedReports.met).toBe(false);
      expect(result.criteria.noWarnings.met).toBe(false);
    }
  });

  it("returns error when user not found", async () => {
    mockAdminAuth();
    mockListDocuments.mockResolvedValueOnce({ documents: [], total: 0 });

    const result = await checkGuardianEligibility(TARGET_USER_ID);
    expect(result).toEqual({ error: "User not found" });
  });
});

// ─── getGuardianCandidates ──────────────────────────

describe("getGuardianCandidates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires admin — returns error for non-admin", async () => {
    mockUnauthenticated();
    const result = await getGuardianCandidates();
    expect(result).toEqual({ error: "Unauthorized" });
  });

  it("returns paginated list of eligible members", async () => {
    mockAdminAuth();
    mockListDocuments.mockResolvedValueOnce({
      documents: [
        makeProfile({ $id: "p1", userId: "u1", totalEventsAttended: 20 }),
        makeProfile({ $id: "p2", userId: "u2", totalEventsAttended: 12 }),
      ],
      total: 2,
    });

    const result = await getGuardianCandidates(1, 10);
    expect("candidates" in result).toBe(true);
    if ("candidates" in result) {
      expect(result.candidates).toHaveLength(2);
      expect(result.total).toBe(2);
    }
  });
});
