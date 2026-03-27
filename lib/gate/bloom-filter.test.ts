import { describe, it, expect } from "vitest";
import { BloomFilter } from "./bloom-filter";

describe("BloomFilter", () => {
  it("reports membership for added items", () => {
    const filter = new BloomFilter(1000, 0.01);
    const items = ["ticket-001", "ticket-002", "ticket-003", "hello@world.com"];

    for (const item of items) {
      filter.add(item);
    }

    for (const item of items) {
      expect(filter.has(item)).toBe(true);
    }
  });

  it("reports non-membership for items not added", () => {
    const filter = new BloomFilter(1000, 0.01);
    filter.add("ticket-001");
    filter.add("ticket-002");

    // These were never added — should almost certainly return false
    // (with 0.01 FPR and only 2 items in a 1000-capacity filter, FP is negligible)
    expect(filter.has("ticket-999")).toBe(false);
    expect(filter.has("not-a-ticket")).toBe(false);
    expect(filter.has("something-else")).toBe(false);
  });

  it("handles 100K items within expected FPR (<1% actual for 0.1% target)", () => {
    const n = 100_000;
    const targetFpr = 0.001; // 0.1%
    const filter = new BloomFilter(n, targetFpr);

    // Add 100K items
    for (let i = 0; i < n; i++) {
      filter.add(`item-${i}`);
    }

    // Test 100K items that were NOT added
    let falsePositives = 0;
    const testCount = 100_000;
    for (let i = 0; i < testCount; i++) {
      if (filter.has(`nonexistent-${i}`)) {
        falsePositives++;
      }
    }

    const actualFpr = falsePositives / testCount;
    // Assert actual FPR is below 1% (10x the target, generous bound)
    expect(actualFpr).toBeLessThan(0.01);
  });

  it("has zero false negatives (all added items always found)", () => {
    const n = 10_000;
    const filter = new BloomFilter(n, 0.001);

    const items: string[] = [];
    for (let i = 0; i < n; i++) {
      const item = `ticket-${i}-${Math.random().toString(36).slice(2)}`;
      items.push(item);
      filter.add(item);
    }

    // Every single added item must be found — zero false negatives
    for (const item of items) {
      expect(filter.has(item)).toBe(true);
    }
  });

  it("serializes and deserializes correctly", () => {
    const filter = new BloomFilter(5000, 0.01);
    const items = [
      "alpha",
      "bravo",
      "charlie",
      "delta",
      "echo",
      "foxtrot",
      "golf",
      "hotel",
    ];

    for (const item of items) {
      filter.add(item);
    }

    // Serialize
    const serialized = filter.serialize();
    expect(typeof serialized).toBe("string");

    // Deserialize
    const restored = BloomFilter.deserialize(serialized);

    // All previously added items must still be found
    for (const item of items) {
      expect(restored.has(item)).toBe(true);
    }

    // Items never added should still not be found
    expect(restored.has("india")).toBe(false);
    expect(restored.has("juliet")).toBe(false);

    // Size should be preserved
    expect(restored.sizeBytes()).toBe(filter.sizeBytes());
  });

  it("reports size in bytes (1M items at 0.01% FPR should be 1-5MB)", () => {
    const filter = new BloomFilter(1_000_000, 0.0001);
    const size = filter.sizeBytes();

    // 1MB = 1_048_576 bytes, 5MB = 5_242_880 bytes
    expect(size).toBeGreaterThanOrEqual(1_048_576);
    expect(size).toBeLessThanOrEqual(5_242_880);
  });
});
