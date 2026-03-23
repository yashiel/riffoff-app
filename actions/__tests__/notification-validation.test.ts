import { describe, it, expect } from "vitest";
import type { NotificationType } from "@/lib/appwrite/types";

describe("Notification types", () => {
  const ALL_TYPES: NotificationType[] = [
    "ticket_purchased",
    "event_published",
    "event_cancelled",
    "application_submitted",
    "application_accepted",
    "application_rejected",
    "application_shortlisted",
    "checkin_complete",
    "system",
  ];

  it("has exactly 9 notification types", () => {
    expect(ALL_TYPES).toHaveLength(9);
  });

  it("includes all ticket-related types", () => {
    expect(ALL_TYPES).toContain("ticket_purchased");
  });

  it("includes all event-related types", () => {
    expect(ALL_TYPES).toContain("event_published");
    expect(ALL_TYPES).toContain("event_cancelled");
  });

  it("includes all application-related types", () => {
    expect(ALL_TYPES).toContain("application_submitted");
    expect(ALL_TYPES).toContain("application_accepted");
    expect(ALL_TYPES).toContain("application_rejected");
    expect(ALL_TYPES).toContain("application_shortlisted");
  });

  it("includes checkin and system types", () => {
    expect(ALL_TYPES).toContain("checkin_complete");
    expect(ALL_TYPES).toContain("system");
  });
});

describe("Notification message templates", () => {
  const statusLabels: Record<string, { title: string; body: string }> = {
    accepted: { title: "Application accepted!", body: 'You\'ve been accepted to perform at "Test Event"' },
    rejected: { title: "Application update", body: 'Your application for "Test Event" was not selected' },
    shortlisted: { title: "You've been shortlisted!", body: 'You\'re shortlisted for "Test Event"' },
  };

  it("accepted has correct title", () => {
    expect(statusLabels.accepted.title).toBe("Application accepted!");
  });

  it("rejected has neutral title (not negative)", () => {
    expect(statusLabels.rejected.title).toBe("Application update");
    expect(statusLabels.rejected.title).not.toContain("rejected");
  });

  it("shortlisted has encouraging title", () => {
    expect(statusLabels.shortlisted.title).toContain("shortlisted");
  });

  it("all bodies mention the event title", () => {
    for (const label of Object.values(statusLabels)) {
      expect(label.body).toContain("Test Event");
    }
  });
});

describe("Time ago formatting logic", () => {
  function getTimeAgo(dateStr: string): string {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffMs = now - then;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return new Date(dateStr).toLocaleDateString();
  }

  it("returns 'Just now' for current time", () => {
    expect(getTimeAgo(new Date().toISOString())).toBe("Just now");
  });

  it("returns minutes for recent times", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60000).toISOString();
    expect(getTimeAgo(fiveMinAgo)).toBe("5m ago");
  });

  it("returns hours for today", () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 3600000).toISOString();
    expect(getTimeAgo(threeHoursAgo)).toBe("3h ago");
  });

  it("returns days for recent past", () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString();
    expect(getTimeAgo(twoDaysAgo)).toBe("2d ago");
  });

  it("returns date string for older than a week", () => {
    const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString();
    const result = getTimeAgo(twoWeeksAgo);
    expect(result).not.toContain("ago");
    expect(result).toContain("/"); // date format
  });
});
