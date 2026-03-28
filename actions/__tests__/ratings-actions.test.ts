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

// ─── Helpers ────────────────────────────────────────

const USER_ID = "user-001";
const EVENT_ID = "event-001";
const ORGANISER_ID = "org-001";

function mockAuthenticated(userId = USER_ID) {
  mockAccountGet.mockResolvedValue({ $id: userId });
  _sessionClientOverride = { account: { get: mockAccountGet } };
}

function mockUnauthenticated() {
  _sessionClientOverride = null;
}

function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    $id: EVENT_ID,
    title: "Test Concert",
    status: "completed",
    organiserId: ORGANISER_ID,
    ...overrides,
  };
}

// ─── Import SUT ─────────────────────────────────────

import {
  submitEventRating,
  getEventRatings,
  getEventRatingsSummary,
  getOrganiserRatingsSummary,
} from "../ratings";

// ─── Tests ──────────────────────────────────────────

describe("submitEventRating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticated();
  });

  it("returns error when not authenticated", async () => {
    mockUnauthenticated();
    const result = await submitEventRating(EVENT_ID, 4);
    expect(result).toEqual({ error: "Please log in" });
  });

  it("returns error for rating below 1", async () => {
    const result = await submitEventRating(EVENT_ID, 0);
    expect(result).toHaveProperty("error");
  });

  it("returns error for rating above 5", async () => {
    const result = await submitEventRating(EVENT_ID, 6);
    expect(result).toHaveProperty("error");
  });

  it("returns error for non-integer rating", async () => {
    const result = await submitEventRating(EVENT_ID, 3.5);
    expect(result).toHaveProperty("error");
  });

  it("returns error for comment exceeding 500 chars", async () => {
    const longComment = "x".repeat(501);
    const result = await submitEventRating(EVENT_ID, 4, longComment);
    expect(result).toHaveProperty("error");
  });

  it("returns error when event is not completed", async () => {
    mockGetDocument.mockResolvedValueOnce(makeEvent({ status: "published" }));
    const result = await submitEventRating(EVENT_ID, 4);
    expect(result).toEqual({ error: "Ratings can only be submitted for completed events" });
  });

  it("returns error when user has no ticket for event", async () => {
    mockGetDocument.mockResolvedValueOnce(makeEvent());
    mockListDocuments.mockResolvedValueOnce({ documents: [], total: 0 });
    const result = await submitEventRating(EVENT_ID, 4);
    expect(result).toEqual({ error: "You must have a ticket for this event to rate it" });
  });

  it("returns error when user already rated this event", async () => {
    mockGetDocument.mockResolvedValueOnce(makeEvent());
    mockListDocuments.mockResolvedValueOnce({ documents: [{ $id: "t1" }], total: 1 });
    mockListDocuments.mockResolvedValueOnce({ documents: [{ $id: "r1" }], total: 1 });

    const result = await submitEventRating(EVENT_ID, 4);
    expect(result).toEqual({ error: "You have already rated this event" });
  });

  it("creates rating with correct organiserId on valid input", async () => {
    mockGetDocument.mockResolvedValueOnce(makeEvent());
    mockListDocuments.mockResolvedValueOnce({ documents: [{ $id: "t1" }], total: 1 });
    mockListDocuments.mockResolvedValueOnce({ documents: [], total: 0 });
    mockCreateDocument.mockResolvedValueOnce({ $id: "rating-001" });

    const result = await submitEventRating(EVENT_ID, 5, "Great show!");
    expect(result).toEqual({ success: true });
    expect(mockCreateDocument).toHaveBeenCalledOnce();

    const data = mockCreateDocument.mock.calls[0][3];
    expect(data.eventId).toBe(EVENT_ID);
    expect(data.userId).toBe(USER_ID);
    expect(data.rating).toBe(5);
    expect(data.comment).toBe("Great show!");
    expect(data.organiserId).toBe(ORGANISER_ID);
  });

  it("sets comment to null when not provided", async () => {
    mockGetDocument.mockResolvedValueOnce(makeEvent());
    mockListDocuments.mockResolvedValueOnce({ documents: [{ $id: "t1" }], total: 1 });
    mockListDocuments.mockResolvedValueOnce({ documents: [], total: 0 });
    mockCreateDocument.mockResolvedValueOnce({ $id: "rating-002" });

    await submitEventRating(EVENT_ID, 3);
    const data = mockCreateDocument.mock.calls[0][3];
    expect(data.comment).toBeNull();
  });
});

describe("getEventRatings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns paginated results with user names", async () => {
    mockListDocuments
      .mockResolvedValueOnce({
        documents: [
          { $id: "r1", userId: "u1", eventId: EVENT_ID, rating: 5, comment: "Amazing", $createdAt: "2026-01-01T00:00:00Z" },
          { $id: "r2", userId: "u2", eventId: EVENT_ID, rating: 3, comment: null, $createdAt: "2026-01-02T00:00:00Z" },
        ],
        total: 2,
      })
      .mockResolvedValueOnce({
        documents: [
          { userId: "u1", displayName: "Alice" },
          { userId: "u2", displayName: "Bob" },
        ],
        total: 2,
      });

    const result = await getEventRatings(EVENT_ID, 1, 20);
    expect(result.total).toBe(2);
    expect(result.ratings).toHaveLength(2);
    expect(result.ratings[0].userName).toBe("Alice");
    expect(result.ratings[1].userName).toBe("Bob");
  });

  it("falls back to 'Anonymous' when no profile found", async () => {
    mockListDocuments
      .mockResolvedValueOnce({
        documents: [
          { $id: "r1", userId: "unknown-user", eventId: EVENT_ID, rating: 4, comment: null, $createdAt: "2026-01-01T00:00:00Z" },
        ],
        total: 1,
      })
      .mockResolvedValueOnce({ documents: [], total: 0 });

    const result = await getEventRatings(EVENT_ID);
    expect(result.ratings[0].userName).toBe("Anonymous");
  });
});

describe("getEventRatingsSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns correct average and total", async () => {
    mockListDocuments.mockResolvedValueOnce({
      documents: [{ rating: 5 }, { rating: 3 }, { rating: 4 }],
      total: 3,
    });

    const result = await getEventRatingsSummary(EVENT_ID);
    expect(result.totalRatings).toBe(3);
    expect(result.averageRating).toBe(4);
  });

  it("returns 0/0 for event with no ratings", async () => {
    mockListDocuments.mockResolvedValueOnce({ documents: [], total: 0 });

    const result = await getEventRatingsSummary(EVENT_ID);
    expect(result).toEqual({ averageRating: 0, totalRatings: 0 });
  });

  it("rounds average to 1 decimal place", async () => {
    mockListDocuments.mockResolvedValueOnce({
      documents: [{ rating: 5 }, { rating: 4 }],
      total: 2,
    });

    const result = await getEventRatingsSummary(EVENT_ID);
    expect(result.averageRating).toBe(4.5);
  });
});

describe("getOrganiserRatingsSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("aggregates across all organiser events", async () => {
    mockListDocuments.mockResolvedValueOnce({
      documents: [{ rating: 5 }, { rating: 3 }, { rating: 4 }, { rating: 2 }],
      total: 4,
    });

    const result = await getOrganiserRatingsSummary(ORGANISER_ID);
    expect(result.totalRatings).toBe(4);
    expect(result.averageRating).toBe(3.5);
  });

  it("returns 0/0 for organiser with no ratings", async () => {
    mockListDocuments.mockResolvedValueOnce({ documents: [], total: 0 });

    const result = await getOrganiserRatingsSummary(ORGANISER_ID);
    expect(result).toEqual({ averageRating: 0, totalRatings: 0 });
  });
});
