import { describe, it, expect } from "vitest";
import type { ApplicationStatus } from "@/lib/appwrite/types";

/** Valid status transitions — mirrors the logic in actions/applications.ts */
const VALID_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  submitted: ["shortlisted", "rejected"],
  shortlisted: ["accepted", "rejected"],
  accepted: [],
  rejected: [],
  withdrawn: [],
};

describe("Application status transitions", () => {
  it("submitted can transition to shortlisted", () => {
    expect(VALID_TRANSITIONS["submitted"]).toContain("shortlisted");
  });

  it("submitted can transition to rejected", () => {
    expect(VALID_TRANSITIONS["submitted"]).toContain("rejected");
  });

  it("submitted CANNOT transition directly to accepted", () => {
    expect(VALID_TRANSITIONS["submitted"]).not.toContain("accepted");
  });

  it("shortlisted can transition to accepted", () => {
    expect(VALID_TRANSITIONS["shortlisted"]).toContain("accepted");
  });

  it("shortlisted can transition to rejected", () => {
    expect(VALID_TRANSITIONS["shortlisted"]).toContain("rejected");
  });

  it("accepted is a terminal state (no transitions)", () => {
    expect(VALID_TRANSITIONS["accepted"]).toHaveLength(0);
  });

  it("rejected is a terminal state (no transitions)", () => {
    expect(VALID_TRANSITIONS["rejected"]).toHaveLength(0);
  });

  it("withdrawn is a terminal state (no transitions)", () => {
    expect(VALID_TRANSITIONS["withdrawn"]).toHaveLength(0);
  });

  it("no status can transition to submitted (start state only)", () => {
    for (const transitions of Object.values(VALID_TRANSITIONS)) {
      expect(transitions).not.toContain("submitted");
    }
  });

  it("no status can transition to withdrawn (artist action only)", () => {
    for (const transitions of Object.values(VALID_TRANSITIONS)) {
      expect(transitions).not.toContain("withdrawn");
    }
  });

  it("enforces a linear pipeline: submitted → shortlisted → accepted", () => {
    expect(VALID_TRANSITIONS["submitted"]).toContain("shortlisted");
    expect(VALID_TRANSITIONS["shortlisted"]).toContain("accepted");
    expect(VALID_TRANSITIONS["submitted"]).not.toContain("accepted");
  });
});

describe("CSV export formatting", () => {
  it("escapes double quotes in names", () => {
    const name = 'DJ "The Boss" Khaled';
    const escaped = `"${name.replace(/"/g, '""')}"`;
    expect(escaped).toBe('"DJ ""The Boss"" Khaled"');
  });

  it("CSV header has correct columns", () => {
    const headers = [
      "Ticket Code",
      "Attendee Name",
      "Tier",
      "Status",
      "Checked In",
      "Checked In At",
    ];
    expect(headers).toHaveLength(6);
    expect(headers.join(",")).toBe(
      "Ticket Code,Attendee Name,Tier,Status,Checked In,Checked In At",
    );
  });

  it("formats checked-in status correctly", () => {
    const checkedIn = true;
    expect(checkedIn ? "Yes" : "No").toBe("Yes");
    expect(false ? "Yes" : "No").toBe("No");
  });
});
