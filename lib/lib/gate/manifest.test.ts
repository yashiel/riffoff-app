import { describe, it, expect } from "vitest";
import { hashTicket, buildManifest } from "./manifest";
import type { ManifestPublicKey, GateConfig } from "./manifest";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const TEST_PUBLIC_KEYS: ManifestPublicKey[] = [
  { kid: "key-1", key: "BASE64_PUB_KEY", active: true },
];

const TEST_GATE_CONFIG: GateConfig = {
  gateId: "gate-main",
  gateName: "Main Entrance",
  lanes: 4,
};

// ---------------------------------------------------------------------------
// hashTicket
// ---------------------------------------------------------------------------

describe("hashTicket", () => {
  it("is deterministic — same inputs produce the same hash", () => {
    const a = hashTicket("ticket-1", "event-1", "salt-abc");
    const b = hashTicket("ticket-1", "event-1", "salt-abc");
    expect(a).toBe(b);
  });

  it("produces a 64-char hex string (SHA-256)", () => {
    const hash = hashTicket("ticket-1", "event-1", "salt-abc");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("different tickets produce different hashes", () => {
    const a = hashTicket("ticket-1", "event-1", "salt-abc");
    const b = hashTicket("ticket-2", "event-1", "salt-abc");
    expect(a).not.toBe(b);
  });

  it("different event salts produce different hashes (cross-event isolation)", () => {
    const a = hashTicket("ticket-1", "event-1", "salt-abc");
    const b = hashTicket("ticket-1", "event-1", "salt-xyz");
    expect(a).not.toBe(b);
  });
});

// ---------------------------------------------------------------------------
// buildManifest
// ---------------------------------------------------------------------------

describe("buildManifest", () => {
  it("uses hash list for small ticket counts (<1M)", () => {
    const tickets = ["t1", "t2", "t3"];
    const manifest = buildManifest(
      tickets,
      "event-1",
      TEST_PUBLIC_KEYS,
      TEST_GATE_CONFIG,
    );

    expect(manifest.ticketHashes).toBeDefined();
    expect(manifest.ticketHashes).toHaveLength(3);
    expect(manifest.bloomFilter).toBeUndefined();
  });

  it("uses bloom filter when forceBloom=true", () => {
    const tickets = ["t1", "t2", "t3"];
    const manifest = buildManifest(
      tickets,
      "event-1",
      TEST_PUBLIC_KEYS,
      TEST_GATE_CONFIG,
      true,
    );

    expect(manifest.bloomFilter).toBeDefined();
    expect(typeof manifest.bloomFilter).toBe("string");
    expect(manifest.ticketHashes).toBeUndefined();
  });

  it("includes a 64-char integrity hash", () => {
    const manifest = buildManifest(
      ["t1"],
      "event-1",
      TEST_PUBLIC_KEYS,
      TEST_GATE_CONFIG,
    );

    expect(manifest.integrity).toHaveLength(64);
    expect(manifest.integrity).toMatch(/^[0-9a-f]{64}$/);
  });

  it("has all required manifest fields", () => {
    const manifest = buildManifest(
      ["t1", "t2"],
      "event-42",
      TEST_PUBLIC_KEYS,
      TEST_GATE_CONFIG,
    );

    expect(manifest.version).toBeTypeOf("number");
    expect(manifest.eventId).toBe("event-42");
    expect(manifest.generatedAt).toBeTruthy();
    expect(new Date(manifest.generatedAt).toISOString()).toBe(
      manifest.generatedAt,
    );
    expect(manifest.publicKeys).toEqual(TEST_PUBLIC_KEYS);
    expect(manifest.totalTickets).toBe(2);
    expect(manifest.gateConfig).toEqual(TEST_GATE_CONFIG);
    expect(manifest.salt).toBeTruthy();
    expect(manifest.salt).toHaveLength(32); // 16 random bytes → 32 hex chars
  });
});
