import { describe, it, expect } from "vitest";
import { signTicketToken, verifyTicketToken } from "../sign";

describe("signTicketToken", () => {
  const validPayload = {
    ticketId: "ticket-123",
    eventId: "event-456",
    nonce: "abc123nonce",
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
  };

  it("produces a token with two parts separated by a dot", () => {
    const token = signTicketToken(validPayload);
    const parts = token.split(".");
    expect(parts).toHaveLength(2);
    expect(parts[0].length).toBeGreaterThan(0);
    expect(parts[1].length).toBeGreaterThan(0);
  });

  it("produces different tokens for different payloads", () => {
    const token1 = signTicketToken(validPayload);
    const token2 = signTicketToken({ ...validPayload, ticketId: "ticket-789" });
    expect(token1).not.toBe(token2);
  });

  it("produces the same token for the same payload (deterministic)", () => {
    const token1 = signTicketToken(validPayload);
    const token2 = signTicketToken(validPayload);
    expect(token1).toBe(token2);
  });
});

describe("verifyTicketToken", () => {
  it("successfully verifies a valid token", () => {
    const payload = {
      ticketId: "ticket-123",
      eventId: "event-456",
      nonce: "test-nonce",
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    const token = signTicketToken(payload);
    const result = verifyTicketToken(token);

    expect(result).not.toBeNull();
    expect(result!.ticketId).toBe("ticket-123");
    expect(result!.eventId).toBe("event-456");
    expect(result!.nonce).toBe("test-nonce");
  });

  it("rejects a token with tampered payload", () => {
    const token = signTicketToken({
      ticketId: "ticket-123",
      eventId: "event-456",
      nonce: "nonce",
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    // Tamper with the payload portion
    const parts = token.split(".");
    const tampered = "dGFtcGVyZWQ" + parts[0].slice(10);
    const result = verifyTicketToken(`${tampered}.${parts[1]}`);

    expect(result).toBeNull();
  });

  it("rejects a token with tampered signature", () => {
    const token = signTicketToken({
      ticketId: "ticket-123",
      eventId: "event-456",
      nonce: "nonce",
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    const parts = token.split(".");
    const tamperedSig = parts[1].slice(0, -3) + "xxx";
    const result = verifyTicketToken(`${parts[0]}.${tamperedSig}`);

    expect(result).toBeNull();
  });

  it("rejects an expired token", () => {
    const token = signTicketToken({
      ticketId: "ticket-123",
      eventId: "event-456",
      nonce: "nonce",
      exp: Math.floor(Date.now() / 1000) - 60, // 1 minute ago
    });

    const result = verifyTicketToken(token);
    expect(result).toBeNull();
  });

  it("rejects empty string", () => {
    expect(verifyTicketToken("")).toBeNull();
  });

  it("rejects token without dot separator", () => {
    expect(verifyTicketToken("nodothere")).toBeNull();
  });

  it("rejects token with too many parts", () => {
    expect(verifyTicketToken("a.b.c")).toBeNull();
  });
});
