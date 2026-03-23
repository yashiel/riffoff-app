import { describe, it, expect } from "vitest";
import { extractSignatureValue } from "../client";

describe("TNG client utilities", () => {
  describe("extractSignatureValue", () => {
    it("extracts signature from standard TNG header format", () => {
      const header =
        "algorithm=RSA256, keyVersion=1, signature=abc123base64value";
      const result = extractSignatureValue(header);
      expect(result).toBe("abc123base64value");
    });

    it("extracts signature with special characters", () => {
      const header =
        "algorithm=RSA256, keyVersion=1, signature=dGVzdCBzaWduYXR1cmU+/=";
      const result = extractSignatureValue(header);
      expect(result).toBe("dGVzdCBzaWduYXR1cmU+/=");
    });

    it("returns empty string for missing signature field", () => {
      const header = "algorithm=RSA256, keyVersion=1";
      const result = extractSignatureValue(header);
      expect(result).toBe("");
    });

    it("returns empty string for empty header", () => {
      expect(extractSignatureValue("")).toBe("");
    });

    it("handles signature as the only field", () => {
      const header = "signature=onlyvalue";
      const result = extractSignatureValue(header);
      expect(result).toBe("onlyvalue");
    });
  });
});

describe("TNG amount formatting", () => {
  it("amount in smallest unit — 10000 = RM100.00", () => {
    const amountCents = 10000;
    const amountStr = String(amountCents);
    expect(amountStr).toBe("10000");
    expect(amountCents / 100).toBe(100);
  });

  it("amount in smallest unit — 2550 = RM25.50", () => {
    const amountCents = 2550;
    expect(String(amountCents)).toBe("2550");
    expect(amountCents / 100).toBe(25.5);
  });

  it("TNG requires string format for amounts", () => {
    // TNG API expects amount as string in smallest unit
    const amount = { currency: "MYR", value: String(5000) };
    expect(amount.value).toBe("5000");
    expect(typeof amount.value).toBe("string");
  });
});
