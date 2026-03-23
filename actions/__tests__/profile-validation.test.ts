import { describe, it, expect } from "vitest";
import { z } from "zod/v4";

/** Profile update schema — mirrors the one in actions/profiles.ts */
const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  phone: z.string().max(20).optional(),
  bio: z.string().max(500).optional(),
  artistGenres: z.array(z.string().max(50)).max(10).optional(),
  socialLinks: z.array(z.string().url().max(200)).max(5).optional(),
  portfolioUrls: z.array(z.string().url().max(200)).max(10).optional(),
  photoUrl: z.string().optional(),
});

describe("Profile update validation", () => {
  it("accepts valid profile update", () => {
    expect(
      updateProfileSchema.safeParse({
        displayName: "DJ Eclipse",
        bio: "Electronic music producer from KL",
        artistGenres: ["Electronic", "Techno"],
        socialLinks: ["https://instagram.com/djeclipse"],
      }).success,
    ).toBe(true);
  });

  it("accepts empty update (no fields)", () => {
    expect(updateProfileSchema.safeParse({}).success).toBe(true);
  });

  it("rejects empty displayName", () => {
    expect(
      updateProfileSchema.safeParse({ displayName: "" }).success,
    ).toBe(false);
  });

  it("rejects displayName over 100 chars", () => {
    expect(
      updateProfileSchema.safeParse({ displayName: "x".repeat(101) }).success,
    ).toBe(false);
  });

  it("rejects bio over 500 chars", () => {
    expect(
      updateProfileSchema.safeParse({ bio: "x".repeat(501) }).success,
    ).toBe(false);
  });

  it("rejects more than 10 genres", () => {
    const genres = Array.from({ length: 11 }, (_, i) => `Genre${i}`);
    expect(
      updateProfileSchema.safeParse({ artistGenres: genres }).success,
    ).toBe(false);
  });

  it("rejects more than 5 social links", () => {
    const links = Array.from(
      { length: 6 },
      (_, i) => `https://example.com/${i}`,
    );
    expect(
      updateProfileSchema.safeParse({ socialLinks: links }).success,
    ).toBe(false);
  });

  it("rejects invalid URLs in social links", () => {
    expect(
      updateProfileSchema.safeParse({
        socialLinks: ["not-a-url"],
      }).success,
    ).toBe(false);
  });

  it("rejects more than 10 portfolio URLs", () => {
    const urls = Array.from(
      { length: 11 },
      (_, i) => `https://mixcloud.com/set${i}`,
    );
    expect(
      updateProfileSchema.safeParse({ portfolioUrls: urls }).success,
    ).toBe(false);
  });

  it("accepts valid portfolio URLs", () => {
    expect(
      updateProfileSchema.safeParse({
        portfolioUrls: [
          "https://mixcloud.com/myset",
          "https://youtube.com/watch?v=abc",
        ],
      }).success,
    ).toBe(true);
  });

  it("rejects phone over 20 chars", () => {
    expect(
      updateProfileSchema.safeParse({ phone: "1".repeat(21) }).success,
    ).toBe(false);
  });
});
