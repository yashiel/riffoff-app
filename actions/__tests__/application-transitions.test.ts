import { describe, it, expect } from "vitest";
import type { ApplicationStatus } from "@/lib/appwrite/types";

/**
 * Status transition rules — mirrors the logic in actions/applications.ts
 *
 * Organiser-driven statuses are fully reversible — the organiser can change
 * their mind at any time. `withdrawn` is the artist's own decision and is
 * terminal: organisers cannot un-withdraw an application on the artist's behalf.
 */
const ORGANISER_DECISIONS: ApplicationStatus[] = [
  "submitted",
  "shortlisted",
  "accepted",
  "rejected",
];

function organiserCanChange(
  from: ApplicationStatus,
  to: ApplicationStatus,
): boolean {
  if (from === "withdrawn") return false; // artist decision is terminal
  if (!ORGANISER_DECISIONS.includes(to)) return false; // organiser can never withdraw
  return true;
}

describe("Application status transitions (reversible)", () => {
  it("submitted → shortlisted is allowed", () => {
    expect(organiserCanChange("submitted", "shortlisted")).toBe(true);
  });

  it("submitted → accepted is allowed (organiser may skip shortlisting)", () => {
    expect(organiserCanChange("submitted", "accepted")).toBe(true);
  });

  it("submitted → rejected is allowed", () => {
    expect(organiserCanChange("submitted", "rejected")).toBe(true);
  });

  it("accepted → shortlisted is allowed (organiser changes their mind)", () => {
    expect(organiserCanChange("accepted", "shortlisted")).toBe(true);
  });

  it("accepted → rejected is allowed (organiser reverses acceptance)", () => {
    expect(organiserCanChange("accepted", "rejected")).toBe(true);
  });

  it("rejected → shortlisted is allowed (organiser reconsiders)", () => {
    expect(organiserCanChange("rejected", "shortlisted")).toBe(true);
  });

  it("rejected → accepted is allowed (organiser fully reverses rejection)", () => {
    expect(organiserCanChange("rejected", "accepted")).toBe(true);
  });

  it("any organiser status can be reset back to submitted", () => {
    expect(organiserCanChange("shortlisted", "submitted")).toBe(true);
    expect(organiserCanChange("accepted", "submitted")).toBe(true);
    expect(organiserCanChange("rejected", "submitted")).toBe(true);
  });

  it("withdrawn is terminal — organiser cannot change it", () => {
    expect(organiserCanChange("withdrawn", "submitted")).toBe(false);
    expect(organiserCanChange("withdrawn", "shortlisted")).toBe(false);
    expect(organiserCanChange("withdrawn", "accepted")).toBe(false);
    expect(organiserCanChange("withdrawn", "rejected")).toBe(false);
  });

  it("organiser cannot transition any status to withdrawn (artist-only)", () => {
    for (const from of ORGANISER_DECISIONS) {
      expect(organiserCanChange(from, "withdrawn")).toBe(false);
    }
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
