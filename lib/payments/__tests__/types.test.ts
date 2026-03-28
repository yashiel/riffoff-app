import { describe, it, expect } from "vitest";
import type {
  CheckoutInput,
  CheckoutResult,
  PaymentConfirmation,
  WebhookResult,
} from "../types";

describe("Payment types", () => {
  it("CheckoutInput has required fields", () => {
    const input: CheckoutInput = {
      eventId: "evt-123",
      tierId: "tier-456",
      qty: 2,
      provider: "stripe",
    };
    expect(input.eventId).toBe("evt-123");
    expect(input.qty).toBe(2);
    expect(input.provider).toBe("stripe");
  });

  it("CheckoutInput accepts all 3 providers", () => {
    const providers: CheckoutInput["provider"][] = ["stripe", "paypal", "tng"];
    expect(providers).toHaveLength(3);
  });

  it("CheckoutResult can have redirectUrl for Stripe/TNG", () => {
    const result: CheckoutResult = {
      orderId: "ord-123",
      reservationId: "res-456",
      redirectUrl: "https://checkout.stripe.com/...",
    };
    expect(result.redirectUrl).toBeTruthy();
    expect(result.error).toBeUndefined();
  });

  it("CheckoutResult can have paypalOrderId for PayPal", () => {
    const result: CheckoutResult = {
      orderId: "ord-123",
      reservationId: "res-456",
      paypalOrderId: "ord-123",
    };
    expect(result.paypalOrderId).toBeTruthy();
  });

  it("CheckoutResult can have error", () => {
    const result: CheckoutResult = {
      orderId: "",
      reservationId: "",
      error: "Sold out",
    };
    expect(result.error).toBe("Sold out");
  });

  it("PaymentConfirmation has all required fields", () => {
    const confirmation: PaymentConfirmation = {
      orderId: "ord-123",
      providerRef: "cs_live_abc",
      provider: "stripe",
      amountCents: 5000,
      currency: "USD",
    };
    expect(confirmation.amountCents).toBe(5000);
    expect(confirmation.provider).toBe("stripe");
  });

  it("WebhookResult indicates success or failure", () => {
    const success: WebhookResult = { success: true, orderId: "ord-123" };
    const failure: WebhookResult = { success: false, error: "Invalid sig" };
    expect(success.success).toBe(true);
    expect(failure.success).toBe(false);
    expect(failure.error).toBeTruthy();
  });
});
