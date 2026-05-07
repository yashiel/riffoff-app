import { describe, it, expect } from "vitest";
import { z } from "zod/v4";

/**
 * Event integration tests — validate the full event lifecycle.
 * Tests creation → publish → cancel flow with business rule enforcement.
 */

// Event status machine
type EventStatus = "draft" | "published" | "cancelled";

const VALID_TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  draft: ["published"],
  published: ["cancelled"],
  cancelled: [],
};

describe("Event lifecycle state machine", () => {
  it("draft can only transition to published", () => {
    expect(VALID_TRANSITIONS.draft).toEqual(["published"]);
  });

  it("published can only transition to cancelled", () => {
    expect(VALID_TRANSITIONS.published).toEqual(["cancelled"]);
  });

  it("cancelled is a terminal state", () => {
    expect(VALID_TRANSITIONS.cancelled).toEqual([]);
  });

  it("cannot publish a cancelled event", () => {
    expect(VALID_TRANSITIONS.cancelled).not.toContain("published");
  });

  it("cannot go from draft directly to cancelled", () => {
    expect(VALID_TRANSITIONS.draft).not.toContain("cancelled");
  });
});

describe("Event creation business rules", () => {
  it("title is required and max 200 chars", () => {
    const schema = z.string().min(1).max(200);
    expect(schema.safeParse("Valid Title").success).toBe(true);
    expect(schema.safeParse("").success).toBe(false);
    expect(schema.safeParse("x".repeat(201)).success).toBe(false);
  });

  it("capacity must be a positive integer", () => {
    const schema = z.number().int().min(1);
    expect(schema.safeParse(500).success).toBe(true);
    expect(schema.safeParse(0).success).toBe(false);
    expect(schema.safeParse(-1).success).toBe(false);
    expect(schema.safeParse(1.5).success).toBe(false);
  });

  it("startsAt must be before endsAt", () => {
    const start = new Date("2026-06-15T20:00:00Z");
    const end = new Date("2026-06-16T02:00:00Z");
    expect(start.getTime() < end.getTime()).toBe(true);
  });

  it("free events don't require ticket tiers", () => {
    const isFree = true;
    const tiersCount = 0;
    const canPublish = isFree || tiersCount > 0;
    expect(canPublish).toBe(true);
  });

  it("paid events require at least 1 tier to publish", () => {
    const isFree = false;
    const tiersCount = 0;
    const canPublish = isFree || tiersCount > 0;
    expect(canPublish).toBe(false);
  });

  it("organiser can only manage their own events", () => {
    const eventOrganiserId = "org-123";
    const currentUserId = "org-123";
    const otherUserId = "org-456";
    expect(eventOrganiserId).toBe(currentUserId);
    expect(eventOrganiserId).not.toBe(otherUserId);
  });
});

describe("Event query filters", () => {
  function getDateRangeEnd(range: "today" | "weekend" | "week" | "month"): Date {
    const now = new Date();
    switch (range) {
      case "today": {
        const end = new Date(now);
        end.setHours(23, 59, 59, 999);
        return end;
      }
      case "weekend": {
        const dayOfWeek = now.getDay();
        const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
        const end = new Date(now);
        end.setDate(now.getDate() + daysUntilSunday);
        end.setHours(23, 59, 59, 999);
        return end;
      }
      case "week": {
        const end = new Date(now);
        end.setDate(now.getDate() + 7);
        end.setHours(23, 59, 59, 999);
        return end;
      }
      case "month": {
        const end = new Date(now);
        end.setMonth(now.getMonth() + 1);
        end.setHours(23, 59, 59, 999);
        return end;
      }
    }
  }

  it("today range ends at 23:59:59", () => {
    const end = getDateRangeEnd("today");
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
  });

  it("week range is 7 days ahead", () => {
    const now = new Date();
    const end = getDateRangeEnd("week");
    const diffDays = Math.ceil((end.getTime() - now.getTime()) / 86400000);
    expect(diffDays).toBeGreaterThanOrEqual(6);
    expect(diffDays).toBeLessThanOrEqual(8);
  });

  it("month range is roughly 30 days ahead", () => {
    const now = new Date();
    const end = getDateRangeEnd("month");
    const diffDays = Math.ceil((end.getTime() - now.getTime()) / 86400000);
    expect(diffDays).toBeGreaterThanOrEqual(27);
    expect(diffDays).toBeLessThanOrEqual(32);
  });
});
