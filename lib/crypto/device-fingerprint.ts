import crypto from "crypto";

/**
 * Generate a deterministic device fingerprint from device characteristics.
 * Returns a SHA256 hex string (64 characters).
 *
 * Only uses stable device properties (userAgent + timezone) — NOT screen size
 * or language, which can change between requests (rotation, locale switch).
 */
export function generateFingerprint(
  userAgent: string,
  _screenSize: string,
  timezone: string,
  _language: string
): string {
  const input = [userAgent, timezone].join("|");
  return crypto.createHash("sha256").update(input).digest("hex");
}

/**
 * Validate a stored fingerprint against current device characteristics.
 * Uses constant-time comparison (crypto.timingSafeEqual) to prevent timing attacks.
 *
 * This function only handles the FULL fingerprint check (hash comparison).
 * The SSE/EventSource case (missing custom headers) is handled by
 * validateSession() which does a direct user-agent string comparison instead.
 */
export function validateFingerprint(
  storedFingerprint: string,
  userAgent: string,
  screenSize: string,
  timezone: string,
  language: string
): boolean {
  try {
    const computed = generateFingerprint(userAgent, screenSize, timezone, language);
    const storedBuffer = Buffer.from(storedFingerprint, "hex");
    const computedBuffer = Buffer.from(computed, "hex");
    if (storedBuffer.length !== computedBuffer.length) return false;
    return crypto.timingSafeEqual(storedBuffer, computedBuffer);
  } catch {
    return false;
  }
}
