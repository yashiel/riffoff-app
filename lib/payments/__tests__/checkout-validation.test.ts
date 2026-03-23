import { describe, it, expect } from "vitest";
import { z } from "zod/v4";

/**
 * Tests for checkout input validation logic.
 * We recreate the schema here to test it in isolation
 * (the actual schema is inside the Server Action, which needs server context).
 */
const checkoutSchema = z.object({
  eventId: z.string().min(1),
  tierId: z.string().min(1),
  qty: z.number().int().min(1).max(10),
  provider: z.enum(["stripe", "paypal", "tng"]),
});

const rsvpSchema = z.object({
  eventId: z.string().min(1),
  status: z.enum(["interested", "going", "notgoing"]),
});

describe("Checkout input validation", () => {
  it("accepts valid checkout input", () => {
    const result = checkoutSchema.safeParse({
      eventId: "evt-123",
      tierId: "tier-456",
      qty: 2,
      provider: "stripe",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty eventId", () => {
    const result = checkoutSchema.safeParse({
      eventId: "",
      tierId: "tier-456",
      qty: 1,
      provider: "stripe",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty tierId", () => {
    const result = checkoutSchema.safeParse({
      eventId: "evt-123",
      tierId: "",
      qty: 1,
      provider: "stripe",
    });
    expect(result.success).toBe(false);
  });

  it("rejects qty of 0", () => {
    const result = checkoutSchema.safeParse({
      eventId: "evt-123",
      tierId: "tier-456",
      qty: 0,
      provider: "stripe",
    });
    expect(result.success).toBe(false);
  });

  it("rejects qty greater than 10", () => {
    const result = checkoutSchema.safeParse({
      eventId: "evt-123",
      tierId: "tier-456",
      qty: 11,
      provider: "stripe",
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative qty", () => {
    const result = checkoutSchema.safeParse({
      eventId: "evt-123",
      tierId: "tier-456",
      qty: -1,
      provider: "stripe",
    });
    expect(result.success).toBe(false);
  });

  it("rejects fractional qty", () => {
    const result = checkoutSchema.safeParse({
      eventId: "evt-123",
      tierId: "tier-456",
      qty: 1.5,
      provider: "stripe",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid provider", () => {
    const result = checkoutSchema.safeParse({
      eventId: "evt-123",
      tierId: "tier-456",
      qty: 1,
      provider: "bitcoin",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all 3 valid providers", () => {
    for (const provider of ["stripe", "paypal", "tng"]) {
      const result = checkoutSchema.safeParse({
        eventId: "evt-123",
        tierId: "tier-456",
        qty: 1,
        provider,
      });
      expect(result.success).toBe(true);
    }
  });

  it("accepts max qty of 10", () => {
    const result = checkoutSchema.safeParse({
      eventId: "evt-123",
      tierId: "tier-456",
      qty: 10,
      provider: "stripe",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing fields", () => {
    const result = checkoutSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("RSVP input validation", () => {
  it("accepts valid RSVP input", () => {
    const result = rsvpSchema.safeParse({
      eventId: "evt-123",
      status: "going",
    });
    expect(result.success).toBe(true);
  });

  it("accepts all 3 RSVP statuses", () => {
    for (const status of ["interested", "going", "notgoing"]) {
      const result = rsvpSchema.safeParse({ eventId: "evt-123", status });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid RSVP status", () => {
    const result = rsvpSchema.safeParse({
      eventId: "evt-123",
      status: "maybe",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty eventId", () => {
    const result = rsvpSchema.safeParse({
      eventId: "",
      status: "going",
    });
    expect(result.success).toBe(false);
  });
});

describe("Idempotency key generation logic", () => {
  it("same inputs produce same hash", async () => {
    const crypto = await import("crypto");
    const key1 = crypto
      .createHash("sha256")
      .update("user1:tier1:2:12345")
      .digest("hex");
    const key2 = crypto
      .createHash("sha256")
      .update("user1:tier1:2:12345")
      .digest("hex");
    expect(key1).toBe(key2);
  });

  it("different inputs produce different hashes", async () => {
    const crypto = await import("crypto");
    const key1 = crypto
      .createHash("sha256")
      .update("user1:tier1:2:12345")
      .digest("hex");
    const key2 = crypto
      .createHash("sha256")
      .update("user2:tier1:2:12345")
      .digest("hex");
    expect(key1).not.toBe(key2);
  });

  it("time bucket changes every minute", () => {
    // Use a fixed timestamp at the START of a minute (divisible by 60000)
    const minuteStart = 1774000000000 - (1774000000000 % 60000);
    const bucket1 = Math.floor(minuteStart / 60000);
    const bucket2 = Math.floor((minuteStart + 30000) / 60000); // 30s later, same bucket
    expect(bucket1).toBe(bucket2);

    // Exactly one minute later = different bucket
    const bucket3 = Math.floor((minuteStart + 60000) / 60000);
    expect(bucket3).toBe(bucket1 + 1);
  });
});

describe("Amount calculations", () => {
  it("server-side amount from tier price × qty", () => {
    const tierPrice = 25.5; // double from Appwrite
    const qty = 2;
    const amountCents = Math.round(tierPrice * 100) * qty;
    expect(amountCents).toBe(5100);
  });

  it("handles integer tier prices correctly", () => {
    const tierPrice = 50.0;
    const qty = 3;
    const amountCents = Math.round(tierPrice * 100) * qty;
    expect(amountCents).toBe(15000);
  });

  it("handles floating point precision", () => {
    // 19.99 * 100 could be 1998.9999... in JS
    const tierPrice = 19.99;
    const amountCents = Math.round(tierPrice * 100);
    expect(amountCents).toBe(1999);
  });

  it("handles zero price (free events should use RSVP, not checkout)", () => {
    const tierPrice = 0;
    const qty = 1;
    const amountCents = Math.round(tierPrice * 100) * qty;
    expect(amountCents).toBe(0);
  });
});
