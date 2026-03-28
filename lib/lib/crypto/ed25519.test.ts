import { describe, it, expect } from "vitest";

describe("Ed25519 Crypto", () => {
  it("generates a valid keypair", async () => {
    const { generateKeyPair } = await import("./ed25519");
    const { publicKey, privateKey } = await generateKeyPair();
    expect(publicKey).toBeTypeOf("string");
    expect(privateKey).toBeTypeOf("string");
    expect(publicKey.length).toBeGreaterThan(0);
    expect(privateKey.length).toBeGreaterThan(0);
    expect(publicKey).not.toBe(privateKey);
  });

  it("signs and verifies a payload", async () => {
    const { generateKeyPair, sign, verify } = await import("./ed25519");
    const { publicKey, privateKey } = await generateKeyPair();
    const payload = JSON.stringify({ ticketId: "t1", eventId: "e1" });
    const signature = await sign(payload, privateKey);
    expect(signature).toBeTypeOf("string");
    const valid = await verify(payload, signature, publicKey);
    expect(valid).toBe(true);
  });

  it("rejects tampered payload", async () => {
    const { generateKeyPair, sign, verify } = await import("./ed25519");
    const { publicKey, privateKey } = await generateKeyPair();
    const signature = await sign("original", privateKey);
    const valid = await verify("tampered", signature, publicKey);
    expect(valid).toBe(false);
  });

  it("rejects wrong public key", async () => {
    const { generateKeyPair, sign, verify } = await import("./ed25519");
    const kp1 = await generateKeyPair();
    const kp2 = await generateKeyPair();
    const signature = await sign("data", kp1.privateKey);
    const valid = await verify("data", signature, kp2.publicKey);
    expect(valid).toBe(false);
  });

  it("rejects invalid signature format", async () => {
    const { generateKeyPair, verify } = await import("./ed25519");
    const { publicKey } = await generateKeyPair();
    const valid = await verify("data", "not-a-signature", publicKey);
    expect(valid).toBe(false);
  });

  it("produces different signatures for different payloads", async () => {
    const { generateKeyPair, sign } = await import("./ed25519");
    const { privateKey } = await generateKeyPair();
    const sig1 = await sign("payload1", privateKey);
    const sig2 = await sign("payload2", privateKey);
    expect(sig1).not.toBe(sig2);
  });

  it("encrypts and decrypts private key with KEK", async () => {
    const { generateKeyPair, encryptPrivateKey, decryptPrivateKey } = await import("./ed25519");
    const { privateKey } = await generateKeyPair();
    const kek = "test-key-encryption-key-32chars!!";
    const encrypted = encryptPrivateKey(privateKey, kek);
    expect(encrypted).not.toBe(privateKey);
    const decrypted = decryptPrivateKey(encrypted, kek);
    expect(decrypted).toBe(privateKey);
  });

  it("rejects decryption with wrong KEK", async () => {
    const { generateKeyPair, encryptPrivateKey, decryptPrivateKey } = await import("./ed25519");
    const { privateKey } = await generateKeyPair();
    const encrypted = encryptPrivateKey(privateKey, "correct-kek-32-characters-long!!");
    expect(() => decryptPrivateKey(encrypted, "wrong-kek-32-characters-long!!!")).toThrow();
  });
});
