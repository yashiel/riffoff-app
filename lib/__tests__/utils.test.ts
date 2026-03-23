import { describe, it, expect } from "vitest";
import { cn, formatCurrency, formatCentsToDisplay, formatDate, formatRelativeTime } from "../utils";

describe("cn", () => {
  it("merges class names", () => {
    const result = cn("px-4", "py-2");
    expect(result).toContain("px-4");
    expect(result).toContain("py-2");
  });

  it("handles conditional classes", () => {
    const result = cn("base", false && "hidden", "always");
    expect(result).toContain("base");
    expect(result).toContain("always");
    expect(result).not.toContain("hidden");
  });

  it("merges conflicting tailwind classes (last wins)", () => {
    const result = cn("px-4", "px-8");
    expect(result).toBe("px-8");
  });

  it("handles undefined and null", () => {
    const result = cn("base", undefined, null, "end");
    expect(result).toContain("base");
    expect(result).toContain("end");
  });
});

describe("formatCurrency", () => {
  it("formats MYR correctly", () => {
    const result = formatCurrency(25.5, "MYR");
    expect(result).toContain("25.50");
  });

  it("formats USD correctly", () => {
    const result = formatCurrency(100, "USD");
    expect(result).toContain("100.00");
  });

  it("defaults to MYR", () => {
    const result = formatCurrency(10);
    expect(result).toContain("10.00");
  });

  it("handles zero", () => {
    const result = formatCurrency(0, "MYR");
    expect(result).toContain("0.00");
  });

  it("handles decimal precision", () => {
    const result = formatCurrency(19.999, "MYR");
    // Should round to 2 decimal places
    expect(result).toMatch(/20\.00/);
  });
});

describe("formatCentsToDisplay", () => {
  it("converts cents to display currency", () => {
    const result = formatCentsToDisplay(2550, "MYR");
    expect(result).toContain("25.50");
  });

  it("handles zero cents", () => {
    const result = formatCentsToDisplay(0, "MYR");
    expect(result).toContain("0.00");
  });

  it("handles large amounts", () => {
    const result = formatCentsToDisplay(1000000, "MYR");
    expect(result).toContain("10,000.00");
  });
});

describe("formatDate", () => {
  it("formats ISO string to readable date", () => {
    const result = formatDate("2026-06-15T20:00:00.000Z");
    expect(result).toBeTruthy();
    // Should contain some date info (format varies by locale)
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(5);
  });

  it("accepts custom format options", () => {
    const result = formatDate("2026-06-15T20:00:00.000Z", {
      dateStyle: "full",
    });
    expect(result.length).toBeGreaterThan(10); // Full date is longer
  });
});

describe("formatRelativeTime", () => {
  it("returns a string for future dates", () => {
    const future = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const result = formatRelativeTime(future);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns a string for past dates", () => {
    const past = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    const result = formatRelativeTime(past);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});
