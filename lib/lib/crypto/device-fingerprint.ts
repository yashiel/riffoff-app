import crypto from "crypto";

/**
 * Generate a deterministic device fingerprint from device characteristics.
 * Returns a SHA256 hex string (64 characters).
 */
export function generateFingerprint(
  userAgent: string,
  screenSize: string,
  timezone: string,
  language: string
): string {
  const input = [userAgent, screenSize, timezone, language].join("|");
  return crypto.createHash("sha256").update(input).digest("hex");
}

/**
 * Validate a stored fingerprint against current device characteristics.
 * Uses constant-time comparison (crypto.timingSafeEqual) to prevent timing attacks.
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
    return crypto.timingSafeEqual(storedBuffer, computedBuffer);
  } catch {
    return false;
  }
}
