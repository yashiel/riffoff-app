/**
 * CSRF protection utilities.
 *
 * Next.js Server Actions have built-in CSRF protection via the
 * `x-action-redirect` header and origin checking. This module adds
 * an additional layer for webhook endpoints and custom API routes.
 */

import crypto from "crypto";

const CSRF_SECRET = process.env.CSRF_SECRET ?? "csrf-dev-secret-change-in-production-32chars!!";

/** Generate a CSRF token tied to a session */
export function generateCsrfToken(sessionId: string): string {
  const timestamp = Date.now().toString(36);
  const data = `${sessionId}:${timestamp}`;
  const signature = crypto
    .createHmac("sha256", CSRF_SECRET)
    .update(data)
    .digest("base64url");

  return `${data}.${signature}`;
}

/** Verify a CSRF token */
export function verifyCsrfToken(
  token: string,
  sessionId: string,
): boolean {
  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [data, signature] = parts;

  // Verify session matches
  if (!data.startsWith(`${sessionId}:`)) return false;

  // Verify signature
  const expectedSig = crypto
    .createHmac("sha256", CSRF_SECRET)
    .update(data)
    .digest("base64url");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSig),
    );
  } catch {
    return false;
  }
}

/** Verify webhook origin header against allowed origins */
export function verifyWebhookOrigin(
  origin: string | null,
  allowedOrigins: string[],
): boolean {
  if (!origin) return false;
  return allowedOrigins.some(
    (allowed) => origin === allowed || origin.endsWith(`.${allowed}`),
  );
}
