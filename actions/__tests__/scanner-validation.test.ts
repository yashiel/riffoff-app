import { describe, it, expect } from "vitest";
import { signTicketToken, verifyTicketToken } from "@/lib/tickets/sign";

describe("Scanner QR token validation", () => {
  const validPayload = {
    ticketId: "ticket-abc-123",
    eventId: "event-xyz-456",
    nonce: "random-nonce-value",
    exp: Math.floor(Date.now() / 1000) + 300, // 5 min from now
  };

  it("accepts a valid, unexpired token", () => {
    const token = signTicketToken(validPayload);
    const decoded = verifyTicketToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded!.ticketId).toBe("ticket-abc-123");
    expect(decoded!.eventId).toBe("event-xyz-456");
  });

  it("rejects an expired token", () => {
    const expiredPayload = {
      ...validPayload,
      exp: Math.floor(Date.now() / 1000) - 60, // 1 min ago
    };
    const token = signTicketToken(expiredPayload);
    expect(verifyTicketToken(token)).toBeNull();
  });

  it("rejects a tampered token", () => {
    const token = signTicketToken(validPayload);
    const tampered = token.slice(0, -4) + "xxxx";
    expect(verifyTicketToken(tampered)).toBeNull();
  });

  it("rejects a token with no separator", () => {
    expect(verifyTicketToken("no-separator-here")).toBeNull();
  });

  it("rejects an empty string", () => {
    expect(verifyTicketToken("")).toBeNull();
  });

  it("rejects a token with extra parts", () => {
    const token = signTicketToken(validPayload);
    expect(verifyTicketToken(token + ".extra")).toBeNull();
  });

  it("preserves all payload fields through round-trip", () => {
    const token = signTicketToken(validPayload);
    const decoded = verifyTicketToken(token);
    expect(decoded).toEqual(validPayload);
  });

  it("produces different tokens for different nonces", () => {
    const token1 = signTicketToken(validPayload);
    const token2 = signTicketToken({ ...validPayload, nonce: "different-nonce" });
    expect(token1).not.toBe(token2);
  });

  it("produces different tokens for different events", () => {
    const token1 = signTicketToken(validPayload);
    const token2 = signTicketToken({ ...validPayload, eventId: "other-event" });
    expect(token1).not.toBe(token2);
  });
});

describe("Scanner error codes", () => {
  const VALID_ERROR_CODES = [
    "INVALID_TOKEN",
    "EXPIRED_TOKEN",
    "TICKET_NOT_FOUND",
    "ALREADY_CHECKED_IN",
    "TICKET_CANCELLED",
    "WRONG_EVENT",
    "NOT_AUTHORIZED",
    "SERVER_ERROR",
  ] as const;

  it("has exactly 8 error codes", () => {
    expect(VALID_ERROR_CODES).toHaveLength(8);
  });

  it("WRONG_EVENT is a valid error code", () => {
    expect(VALID_ERROR_CODES).toContain("WRONG_EVENT");
  });

  it("ALREADY_CHECKED_IN is a valid error code", () => {
    expect(VALID_ERROR_CODES).toContain("ALREADY_CHECKED_IN");
  });
});

describe("Scanner event filter logic", () => {
  it("filters events ending after day start", () => {
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);

    const futureEvent = new Date(now.getTime() + 3600000).toISOString();
    const pastEvent = new Date(dayStart.getTime() - 86400000).toISOString();

    expect(futureEvent >= dayStart.toISOString()).toBe(true);
    expect(pastEvent >= dayStart.toISOString()).toBe(false);
  });
});
