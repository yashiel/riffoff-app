import { describe, it, expect } from "vitest";
import { generateCsrfToken, verifyCsrfToken, verifyWebhookOrigin } from "../csrf";

describe("CSRF token generation and verification", () => {
  const sessionId = "session-abc-123";

  it("generates a valid token that can be verified", () => {
    const token = generateCsrfToken(sessionId);
    expect(verifyCsrfToken(token, sessionId)).toBe(true);
  });

  it("rejects token for wrong session", () => {
    const token = generateCsrfToken(sessionId);
    expect(verifyCsrfToken(token, "other-session")).toBe(false);
  });

  it("rejects tampered token", () => {
    const token = generateCsrfToken(sessionId);
    const tampered = token.slice(0, -4) + "xxxx";
    expect(verifyCsrfToken(tampered, sessionId)).toBe(false);
  });

  it("rejects empty token", () => {
    expect(verifyCsrfToken("", sessionId)).toBe(false);
  });

  it("rejects token without separator", () => {
    expect(verifyCsrfToken("noseparator", sessionId)).toBe(false);
  });

  it("generates unique tokens for different sessions", () => {
    const t1 = generateCsrfToken("session-1");
    const t2 = generateCsrfToken("session-2");
    expect(t1).not.toBe(t2);
  });
});

describe("Webhook origin verification", () => {
  const allowed = ["stripe.com", "paypal.com", "api.tngdigital.com.my"];

  it("accepts exact match", () => {
    expect(verifyWebhookOrigin("stripe.com", allowed)).toBe(true);
  });

  it("accepts subdomain match", () => {
    expect(verifyWebhookOrigin("events.stripe.com", allowed)).toBe(true);
  });

  it("rejects unknown origin", () => {
    expect(verifyWebhookOrigin("evil.com", allowed)).toBe(false);
  });

  it("rejects null origin", () => {
    expect(verifyWebhookOrigin(null, allowed)).toBe(false);
  });

  it("rejects partial match (not subdomain)", () => {
    expect(verifyWebhookOrigin("notstripe.com", allowed)).toBe(false);
  });
});
