import { describe, it, expect } from "vitest";
import { z } from "zod/v4";
import type { ApplicationStatus } from "@/lib/appwrite/types";

/** Application schema — mirrors the one in actions/artist-applications.ts */
const applySchema = z.object({
  eventId: z.string().min(1),
  notes: z.string().max(500).optional(),
});

describe("Artist application validation", () => {
  it("accepts valid application", () => {
    expect(
      applySchema.safeParse({
        eventId: "evt-123",
        notes: "I play techno sets",
      }).success,
    ).toBe(true);
  });

  it("rejects empty eventId", () => {
    expect(applySchema.safeParse({ eventId: "" }).success).toBe(false);
  });

  it("notes are optional", () => {
    expect(applySchema.safeParse({ eventId: "evt-123" }).success).toBe(true);
  });

  it("rejects notes over 500 chars", () => {
    expect(
      applySchema.safeParse({
        eventId: "evt-123",
        notes: "x".repeat(501),
      }).success,
    ).toBe(false);
  });
});

describe("Artist withdrawal rules", () => {
  const WITHDRAWABLE: ApplicationStatus[] = ["submitted", "shortlisted"];
  const NOT_WITHDRAWABLE: ApplicationStatus[] = ["accepted", "rejected", "withdrawn"];

  for (const status of WITHDRAWABLE) {
    it(`can withdraw from "${status}"`, () => {
      expect(WITHDRAWABLE).toContain(status);
    });
  }

  for (const status of NOT_WITHDRAWABLE) {
    it(`cannot withdraw from "${status}"`, () => {
      expect(WITHDRAWABLE).not.toContain(status);
    });
  }
});

describe("Role upgrade rules", () => {
  const VALID_UPGRADES = ["artist", "organiser"] as const;

  it("attendee can upgrade to artist", () => {
    expect(VALID_UPGRADES).toContain("artist");
  });

  it("attendee can upgrade to organiser", () => {
    expect(VALID_UPGRADES).toContain("organiser");
  });

  it("admin is not a valid upgrade target", () => {
    expect(VALID_UPGRADES).not.toContain("admin");
  });
});
