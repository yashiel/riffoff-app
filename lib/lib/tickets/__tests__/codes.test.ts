import { describe, it, expect } from "vitest";
import { generateTicketCode, generateNonce, hashNonce } from "../codes";

describe("generateTicketCode", () => {
  it("produces a code starting with RIFF-", () => {
    const code = generateTicketCode();
    expect(code).toMatch(/^RIFF-/);
  });

  it("produces a code with exactly 11 characters (RIFF- + 6 chars)", () => {
    const code = generateTicketCode();
    expect(code).toHaveLength(11);
  });

  it("uses only allowed characters (no I/O/0/1)", () => {
    // Run multiple times to increase confidence
    for (let i = 0; i < 100; i++) {
      const code = generateTicketCode();
      const suffix = code.slice(5); // Remove "RIFF-"
      expect(suffix).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/);
    }
  });

  it("produces unique codes across multiple calls", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 50; i++) {
      codes.add(generateTicketCode());
    }
    // With 32^6 = ~1B possibilities, 50 should all be unique
    expect(codes.size).toBe(50);
  });
});

describe("generateNonce", () => {
  it("produces a 64-character hex string", () => {
    const nonce = generateNonce();
    expect(nonce).toHaveLength(64);
    expect(nonce).toMatch(/^[0-9a-f]+$/);
  });

  it("produces unique nonces", () => {
    const n1 = generateNonce();
    const n2 = generateNonce();
    expect(n1).not.toBe(n2);
  });
});

describe("hashNonce", () => {
  it("produces a 64-character hex string (SHA-256)", () => {
    const hash = hashNonce("test-nonce");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it("is deterministic — same input produces same hash", () => {
    const h1 = hashNonce("same-nonce");
    const h2 = hashNonce("same-nonce");
    expect(h1).toBe(h2);
  });

  it("produces different hashes for different inputs", () => {
    const h1 = hashNonce("nonce-a");
    const h2 = hashNonce("nonce-b");
    expect(h1).not.toBe(h2);
  });

  it("is not reversible — hash differs from input", () => {
    const input = "my-secret-nonce";
    const hash = hashNonce(input);
    expect(hash).not.toBe(input);
    expect(hash).not.toContain(input);
  });
});
