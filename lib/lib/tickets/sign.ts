import crypto from "crypto";

const TICKET_SECRET = process.env.TICKET_SIGNING_SECRET ?? "dev-secret-change-me-in-production-min32chars!!";

interface TicketTokenPayload {
  ticketId: string;
  eventId: string;
  nonce: string;
  exp: number; // Unix timestamp
}

/** Sign a ticket token using HMAC-SHA256 */
export function signTicketToken(payload: TicketTokenPayload): string {
  const data = JSON.stringify(payload);
  const encoded = Buffer.from(data).toString("base64url");
  const signature = crypto
    .createHmac("sha256", TICKET_SECRET)
    .update(encoded)
    .digest("base64url");

  return `${encoded}.${signature}`;
}

/** Verify and decode a ticket token */
export function verifyTicketToken(
  token: string,
): TicketTokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [encoded, signature] = parts;

  const expectedSig = crypto
    .createHmac("sha256", TICKET_SECRET)
    .update(encoded)
    .digest("base64url");

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
    return null;
  }

  try {
    const data = JSON.parse(Buffer.from(encoded, "base64url").toString());
    const payload = data as TicketTokenPayload;

    // Check expiry
    if (payload.exp < Date.now() / 1000) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
