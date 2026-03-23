import { describe, it, expect } from "vitest";
import { z } from "zod/v4";

/** Tier schema — mirrors the one in actions/tiers.ts */
const tierSchema = z.object({
  eventId: z.string().min(1),
  name: z.string().min(1).max(100),
  price: z.number().min(0),
  currency: z.string().min(1).max(10).default("MYR"),
  quota: z.number().int().min(1),
  saleStartsAt: z.string().nullable().optional(),
  saleEndsAt: z.string().nullable().optional(),
  sortOrder: z.number().int().default(0),
});

describe("Tier validation", () => {
  const validTier = {
    eventId: "evt-123",
    name: "Early Bird",
    price: 25.5,
    currency: "MYR",
    quota: 100,
    sortOrder: 0,
  };

  it("accepts valid tier input", () => {
    expect(tierSchema.safeParse(validTier).success).toBe(true);
  });

  it("rejects empty name", () => {
    expect(
      tierSchema.safeParse({ ...validTier, name: "" }).success,
    ).toBe(false);
  });

  it("rejects name over 100 chars", () => {
    expect(
      tierSchema.safeParse({ ...validTier, name: "x".repeat(101) }).success,
    ).toBe(false);
  });

  it("accepts price of 0 (free tier)", () => {
    expect(
      tierSchema.safeParse({ ...validTier, price: 0 }).success,
    ).toBe(true);
  });

  it("rejects negative price", () => {
    expect(
      tierSchema.safeParse({ ...validTier, price: -10 }).success,
    ).toBe(false);
  });

  it("rejects quota of 0", () => {
    expect(
      tierSchema.safeParse({ ...validTier, quota: 0 }).success,
    ).toBe(false);
  });

  it("rejects negative quota", () => {
    expect(
      tierSchema.safeParse({ ...validTier, quota: -5 }).success,
    ).toBe(false);
  });

  it("rejects fractional quota", () => {
    expect(
      tierSchema.safeParse({ ...validTier, quota: 50.5 }).success,
    ).toBe(false);
  });

  it("defaults currency to MYR", () => {
    const input = { ...validTier };
    delete (input as Record<string, unknown>).currency;
    const result = tierSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currency).toBe("MYR");
    }
  });

  it("accepts nullable sale dates", () => {
    const result = tierSchema.safeParse({
      ...validTier,
      saleStartsAt: null,
      saleEndsAt: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts ISO date strings for sale dates", () => {
    const result = tierSchema.safeParse({
      ...validTier,
      saleStartsAt: "2026-06-01T00:00:00.000Z",
      saleEndsAt: "2026-06-15T00:00:00.000Z",
    });
    expect(result.success).toBe(true);
  });

  it("defaults sortOrder to 0", () => {
    const input = { ...validTier };
    delete (input as Record<string, unknown>).sortOrder;
    const result = tierSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sortOrder).toBe(0);
    }
  });
});
