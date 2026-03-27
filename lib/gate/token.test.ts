import { describe, it, expect, vi, afterEach } from "vitest";
import { generateKeyPair } from "../crypto/ed25519";
import { createGateToken, verifyGateToken } from "./token";

describe("gate token", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a token with header.payload.signature format", async () => {
    const { privateKey } = await generateKeyPair();
    const token = await createGateToken(
      { tid: "t1", eid: "e1", nonce: "n1" },
      privateKey,
      "kid-1",
      300,
    );

    const parts = token.split(".");
    expect(parts).toHaveLength(3);
    expect(parts[0].length).toBeGreaterThan(0);
    expect(parts[1].length).toBeGreaterThan(0);
    expect(parts[2].length).toBeGreaterThan(0);
  });

  it("header has alg EdDSA and kid matching input", async () => {
    const { privateKey } = await generateKeyPair();
    const token = await createGateToken(
      { tid: "t1", eid: "e1", nonce: "n1" },
      privateKey,
      "my-kid-42",
      300,
    );

    const headerB64 = token.split(".")[0];
    const header = JSON.parse(Buffer.from(headerB64, "base64url").toString("utf8"));
    expect(header.alg).toBe("EdDSA");
    expect(header.kid).toBe("my-kid-42");
  });

  it("payload has tid, eid, nonce, iat, exp fields", async () => {
    const { privateKey } = await generateKeyPair();
    const token = await createGateToken(
      { tid: "ticket-abc", eid: "event-xyz", nonce: "rand-nonce" },
      privateKey,
      "kid-1",
      600,
    );

    const payloadB64 = token.split(".")[1];
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
    expect(payload.tid).toBe("ticket-abc");
    expect(payload.eid).toBe("event-xyz");
    expect(payload.nonce).toBe("rand-nonce");
    expect(typeof payload.iat).toBe("number");
    expect(typeof payload.exp).toBe("number");
    expect(payload.exp).toBe(payload.iat + 600);
  });

  it("verifies a valid token and returns payload", async () => {
    const { privateKey, publicKey } = await generateKeyPair();
    const token = await createGateToken(
      { tid: "t1", eid: "e1", nonce: "n1" },
      privateKey,
      "kid-1",
      300,
    );

    const keys = new Map([["kid-1", publicKey]]);
    const result = await verifyGateToken(token, keys);

    expect(result).not.toBeNull();
    expect(result!.tid).toBe("t1");
    expect(result!.eid).toBe("e1");
    expect(result!.nonce).toBe("n1");
    expect(typeof result!.iat).toBe("number");
    expect(typeof result!.exp).toBe("number");
  });

  it("rejects expired token", async () => {
    const { privateKey, publicKey } = await generateKeyPair();

    // Mock Date.now to create a token in the past
    const realNow = Date.now;
    vi.spyOn(Date, "now").mockReturnValue(realNow() - 600_000); // 10 min ago
    const token = await createGateToken(
      { tid: "t1", eid: "e1", nonce: "n1" },
      privateKey,
      "kid-1",
      60, // 60s TTL, so it expired 9 min ago
    );
    vi.spyOn(Date, "now").mockReturnValue(realNow()); // restore

    const keys = new Map([["kid-1", publicKey]]);
    const result = await verifyGateToken(token, keys);
    expect(result).toBeNull();
  });

  it("rejects unknown kid", async () => {
    const { privateKey } = await generateKeyPair();
    const { publicKey: otherPublic } = await generateKeyPair();

    const token = await createGateToken(
      { tid: "t1", eid: "e1", nonce: "n1" },
      privateKey,
      "kid-unknown",
      300,
    );

    const keys = new Map([["kid-known", otherPublic]]);
    const result = await verifyGateToken(token, keys);
    expect(result).toBeNull();
  });

  it("rejects tampered payload", async () => {
    const { privateKey, publicKey } = await generateKeyPair();
    const token = await createGateToken(
      { tid: "t1", eid: "e1", nonce: "n1" },
      privateKey,
      "kid-1",
      300,
    );

    const parts = token.split(".");
    // Tamper the payload
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    payload.tid = "tampered";
    parts[1] = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
    const tampered = parts.join(".");

    const keys = new Map([["kid-1", publicKey]]);
    const result = await verifyGateToken(tampered, keys);
    expect(result).toBeNull();
  });

  it("rejects malformed tokens", async () => {
    const { publicKey } = await generateKeyPair();
    const keys = new Map([["kid-1", publicKey]]);

    expect(await verifyGateToken("", keys)).toBeNull();
    expect(await verifyGateToken("one.two", keys)).toBeNull();
    expect(await verifyGateToken("not-valid-at-all", keys)).toBeNull();
    expect(await verifyGateToken("a.b.c.d", keys)).toBeNull();
    expect(await verifyGateToken("!!!.@@@.###", keys)).toBeNull();
  });
});
