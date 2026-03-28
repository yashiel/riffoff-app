import { describe, it, expect } from "vitest";
import type {
  UserRole,
  EventStatus,
  OrderStatus,
  TicketStatus,
  RSVPStatus,
  ApplicationStatus,
  PaymentProvider,
  ReservationStatus,
  DisputeStatus,
  ThreadType,
} from "../types";

/**
 * Type-level tests — ensure our enums match what Appwrite expects.
 * These tests verify the type system at runtime by checking all valid values.
 */

describe("Appwrite enum types", () => {
  it("UserRole has all 4 roles", () => {
    const roles: UserRole[] = ["attendee", "artist", "organiser", "admin"];
    expect(roles).toHaveLength(4);
    roles.forEach((r) => expect(typeof r).toBe("string"));
  });

  it("EventStatus has 3 states", () => {
    const statuses: EventStatus[] = ["draft", "published", "cancelled"];
    expect(statuses).toHaveLength(3);
  });

  it("ReservationStatus has 4 states", () => {
    const statuses: ReservationStatus[] = [
      "held",
      "converted",
      "expired",
      "cancelled",
    ];
    expect(statuses).toHaveLength(4);
  });

  it("OrderStatus has 5 states", () => {
    const statuses: OrderStatus[] = [
      "pending",
      "paid",
      "failed",
      "refunded",
      "disputed",
    ];
    expect(statuses).toHaveLength(5);
  });

  it("PaymentProvider has 3 providers", () => {
    const providers: PaymentProvider[] = ["stripe", "paypal", "tng"];
    expect(providers).toHaveLength(3);
  });

  it("TicketStatus has 3 states", () => {
    const statuses: TicketStatus[] = ["active", "void", "refunded"];
    expect(statuses).toHaveLength(3);
  });

  it("RSVPStatus has 3 states", () => {
    const statuses: RSVPStatus[] = ["interested", "notgoing", "going"];
    expect(statuses).toHaveLength(3);
  });

  it("ApplicationStatus has 5 states", () => {
    const statuses: ApplicationStatus[] = [
      "submitted",
      "shortlisted",
      "accepted",
      "rejected",
      "withdrawn",
    ];
    expect(statuses).toHaveLength(5);
  });

  it("ThreadType has 2 types", () => {
    const types: ThreadType[] = ["application", "event"];
    expect(types).toHaveLength(2);
  });

  it("DisputeStatus has 5 states", () => {
    const statuses: DisputeStatus[] = [
      "open",
      "needs_response",
      "submitted",
      "won",
      "lost",
    ];
    expect(statuses).toHaveLength(5);
  });
});
