import { describe, it, expect, vi } from "vitest";
import crypto from "crypto";
import { generateFingerprint, validateFingerprint } from "./device-fingerprint";

describe("generateFingerprint", () => {
  const userAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)";
  const screenSize = "390x844";
  const timezone = "Asia/Kuala_Lumpur";
  const language = "en-MY";

  it("returns a deterministic SHA256 hex string (same inputs → same output)", () => {
    const fp1 = generateFingerprint(userAgent, screenSize, timezone, language);
    const fp2 = generateFingerprint(userAgent, screenSize, timezone, language);
    expect(fp1).toBe(fp2);
  });

  it("output is 64 characters (SHA256 hex)", () => {
    const fp = generateFingerprint(userAgent, screenSize, timezone, language);
    expect(fp).toHaveLength(64);
    expect(fp).toMatch(/^[0-9a-f]{64}$/);
  });

  it("different devices produce different fingerprints", () => {
    const fp1 = generateFingerprint(userAgent, screenSize, timezone, language);
    const fp2 = generateFingerprint(
      "Mozilla/5.0 (Linux; Android 14)",
      "412x915",
      "America/New_York",
      "en-US"
    );
    expect(fp1).not.toBe(fp2);
  });
});

describe("validateFingerprint", () => {
  const userAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)";
  const screenSize = "390x844";
  const timezone = "Asia/Kuala_Lumpur";
  const language = "en-MY";

  it("returns true for matching characteristics", () => {
    const stored = generateFingerprint(userAgent, screenSize, timezone, language);
    expect(validateFingerprint(stored, userAgent, screenSize, timezone, language)).toBe(true);
  });

  it("returns false for mismatched characteristics", () => {
    const stored = generateFingerprint(userAgent, screenSize, timezone, language);
    expect(
      validateFingerprint(stored, "DifferentAgent", screenSize, timezone, language)
    ).toBe(false);
  });

  it("returns false on invalid stored fingerprint", () => {
    expect(
      validateFingerprint("not-a-valid-hex", userAgent, screenSize, timezone, language)
    ).toBe(false);
  });

  it("uses constant-time comparison (crypto.timingSafeEqual)", () => {
    const spy = vi.spyOn(crypto, "timingSafeEqual");
    const stored = generateFingerprint(userAgent, screenSize, timezone, language);
    validateFingerprint(stored, userAgent, screenSize, timezone, language);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
