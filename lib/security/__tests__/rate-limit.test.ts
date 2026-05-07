import { describe, it, expect } from "vitest";
import { checkRateLimit } from "../rate-limit";

describe("Rate limiter", () => {
  const config = { prefix: "test", maxRequests: 3, windowMs: 5000 };

  it("allows requests under the limit", async () => {
    const id = `user-${Date.now()}-1`;
    const r1 = await checkRateLimit(id, config);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);
  });

  it("tracks remaining count correctly", async () => {
    const id = `user-${Date.now()}-2`;
    await checkRateLimit(id, config);
    const r2 = await checkRateLimit(id, config);
    expect(r2.remaining).toBe(1);
    const r3 = await checkRateLimit(id, config);
    expect(r3.remaining).toBe(0);
  });

  it("blocks requests over the limit", async () => {
    const id = `user-${Date.now()}-3`;
    await checkRateLimit(id, config);
    await checkRateLimit(id, config);
    await checkRateLimit(id, config);
    const r4 = await checkRateLimit(id, config);
    expect(r4.allowed).toBe(false);
    expect(r4.remaining).toBe(0);
    expect(r4.retryAfterMs).toBeGreaterThan(0);
  });

  it("isolates different identifiers", async () => {
    const id1 = `user-${Date.now()}-4a`;
    const id2 = `user-${Date.now()}-4b`;
    await checkRateLimit(id1, config);
    await checkRateLimit(id1, config);
    await checkRateLimit(id1, config);

    const r = await checkRateLimit(id2, config);
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(2);
  });

  it("isolates different prefixes", async () => {
    const id = `user-${Date.now()}-5`;
    const config2 = { ...config, prefix: "test2" };
    await checkRateLimit(id, config);
    await checkRateLimit(id, config);
    await checkRateLimit(id, config);

    const r = await checkRateLimit(id, config2);
    expect(r.allowed).toBe(true);
  });

  it("returns retryAfterMs of 0 for allowed requests", async () => {
    const id = `user-${Date.now()}-6`;
    const r = await checkRateLimit(id, config);
    expect(r.retryAfterMs).toBe(0);
  });
});
