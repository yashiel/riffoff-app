import { describe, it, expect } from "vitest";
import { z } from "zod/v4";

/** Event creation schema — mirrors the one in actions/events.ts */
const createEventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  venueId: z.string().min(1),
  genres: z.array(z.string().max(50)).max(10).default([]),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  capacity: z.number().int().min(1),
  isFree: z.boolean(),
  coverimageUrl: z.string().optional(),
});

describe("Event creation validation", () => {
  const validInput = {
    title: "Summer Electronic Night",
    description: "An amazing event",
    venueId: "venue-123",
    genres: ["Electronic", "Techno"],
    startsAt: "2026-06-15T20:00:00.000Z",
    endsAt: "2026-06-16T02:00:00.000Z",
    capacity: 500,
    isFree: false,
  };

  it("accepts valid event input", () => {
    expect(createEventSchema.safeParse(validInput).success).toBe(true);
  });

  it("rejects empty title", () => {
    expect(
      createEventSchema.safeParse({ ...validInput, title: "" }).success,
    ).toBe(false);
  });

  it("rejects title over 200 chars", () => {
    expect(
      createEventSchema.safeParse({ ...validInput, title: "x".repeat(201) })
        .success,
    ).toBe(false);
  });

  it("rejects empty venueId", () => {
    expect(
      createEventSchema.safeParse({ ...validInput, venueId: "" }).success,
    ).toBe(false);
  });

  it("rejects capacity of 0", () => {
    expect(
      createEventSchema.safeParse({ ...validInput, capacity: 0 }).success,
    ).toBe(false);
  });

  it("rejects negative capacity", () => {
    expect(
      createEventSchema.safeParse({ ...validInput, capacity: -10 }).success,
    ).toBe(false);
  });

  it("rejects fractional capacity", () => {
    expect(
      createEventSchema.safeParse({ ...validInput, capacity: 100.5 }).success,
    ).toBe(false);
  });

  it("accepts free event", () => {
    expect(
      createEventSchema.safeParse({ ...validInput, isFree: true }).success,
    ).toBe(true);
  });

  it("defaults genres to empty array", () => {
    const input = { ...validInput };
    delete (input as Record<string, unknown>).genres;
    const result = createEventSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.genres).toEqual([]);
    }
  });

  it("rejects more than 10 genres", () => {
    const genres = Array.from({ length: 11 }, (_, i) => `Genre${i}`);
    expect(
      createEventSchema.safeParse({ ...validInput, genres }).success,
    ).toBe(false);
  });

  it("description is optional", () => {
    const input = { ...validInput };
    delete (input as Record<string, unknown>).description;
    expect(createEventSchema.safeParse(input).success).toBe(true);
  });

  it("rejects description over 1000 chars", () => {
    expect(
      createEventSchema.safeParse({
        ...validInput,
        description: "x".repeat(1001),
      }).success,
    ).toBe(false);
  });
});
