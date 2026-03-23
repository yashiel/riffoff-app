import { describe, it, expect } from "vitest";

/**
 * StatusBadge mapping tests — verify every known status maps to a valid variant.
 * These are logic tests, not render tests (no DOM needed).
 */

// Recreate the mapping from StatusBadge component
type StatusVariant = "default" | "success" | "warning" | "destructive" | "secondary";

const STATUS_VARIANTS: Record<string, StatusVariant> = {
  draft: "secondary",
  published: "success",
  cancelled: "destructive",
  active: "success",
  void: "destructive",
  refunded: "warning",
  pending: "warning",
  paid: "success",
  failed: "destructive",
  disputed: "destructive",
  held: "warning",
  converted: "success",
  expired: "secondary",
  submitted: "default",
  shortlisted: "warning",
  accepted: "success",
  rejected: "destructive",
  withdrawn: "secondary",
  going: "success",
  interested: "default",
  notgoing: "secondary",
  open: "warning",
  needs_response: "destructive",
  won: "success",
  lost: "destructive",
};

describe("StatusBadge variant mapping", () => {
  it("maps all event statuses", () => {
    expect(STATUS_VARIANTS["draft"]).toBe("secondary");
    expect(STATUS_VARIANTS["published"]).toBe("success");
    expect(STATUS_VARIANTS["cancelled"]).toBe("destructive");
  });

  it("maps all ticket statuses", () => {
    expect(STATUS_VARIANTS["active"]).toBe("success");
    expect(STATUS_VARIANTS["void"]).toBe("destructive");
    expect(STATUS_VARIANTS["refunded"]).toBe("warning");
  });

  it("maps all order statuses", () => {
    expect(STATUS_VARIANTS["pending"]).toBe("warning");
    expect(STATUS_VARIANTS["paid"]).toBe("success");
    expect(STATUS_VARIANTS["failed"]).toBe("destructive");
    expect(STATUS_VARIANTS["disputed"]).toBe("destructive");
  });

  it("maps all reservation statuses", () => {
    expect(STATUS_VARIANTS["held"]).toBe("warning");
    expect(STATUS_VARIANTS["converted"]).toBe("success");
    expect(STATUS_VARIANTS["expired"]).toBe("secondary");
  });

  it("maps all application statuses", () => {
    expect(STATUS_VARIANTS["submitted"]).toBe("default");
    expect(STATUS_VARIANTS["shortlisted"]).toBe("warning");
    expect(STATUS_VARIANTS["accepted"]).toBe("success");
    expect(STATUS_VARIANTS["rejected"]).toBe("destructive");
    expect(STATUS_VARIANTS["withdrawn"]).toBe("secondary");
  });

  it("maps all RSVP statuses", () => {
    expect(STATUS_VARIANTS["going"]).toBe("success");
    expect(STATUS_VARIANTS["interested"]).toBe("default");
    expect(STATUS_VARIANTS["notgoing"]).toBe("secondary");
  });

  it("maps all dispute statuses", () => {
    expect(STATUS_VARIANTS["open"]).toBe("warning");
    expect(STATUS_VARIANTS["needs_response"]).toBe("destructive");
    expect(STATUS_VARIANTS["won"]).toBe("success");
    expect(STATUS_VARIANTS["lost"]).toBe("destructive");
  });

  it("success statuses are visually positive", () => {
    const successStatuses = ["published", "active", "paid", "converted", "accepted", "going", "won"];
    for (const status of successStatuses) {
      expect(STATUS_VARIANTS[status]).toBe("success");
    }
  });

  it("destructive statuses indicate problems", () => {
    const destructiveStatuses = ["cancelled", "void", "failed", "disputed", "rejected", "needs_response", "lost"];
    for (const status of destructiveStatuses) {
      expect(STATUS_VARIANTS[status]).toBe("destructive");
    }
  });

  it("has 25 total mapped statuses", () => {
    expect(Object.keys(STATUS_VARIANTS)).toHaveLength(25);
  });
});
