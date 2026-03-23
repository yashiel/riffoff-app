import crypto from "crypto";

/** Generate a human-readable ticket code like "RIFF-A3X9K2" */
export function generateTicketCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No I/O/0/1 to avoid confusion
  const randomBytes = crypto.randomBytes(6);
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[randomBytes[i] % chars.length];
  }
  return `RIFF-${code}`;
}

/** Generate a cryptographic nonce for QR token replay protection */
export function generateNonce(): string {
  return crypto.randomBytes(32).toString("hex");
}

/** Hash a nonce for storage (so raw nonce isn't stored in DB) */
export function hashNonce(nonce: string): string {
  return crypto.createHash("sha256").update(nonce).digest("hex");
}
