import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * PayPal Orders Tests
 *
 * Tests createPayPalOrder and capturePayPalOrder functions.
 * Mocks the PayPal client module and fetch for API calls.
 */

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Mock the client module
vi.mock("../client", () => ({
  getPayPalAccessToken: vi.fn().mockResolvedValue("mock-access-token"),
  getPayPalApiUrl: vi.fn().mockReturnValue("https://api-m.sandbox.paypal.com"),
}));

beforeEach(() => {
  mockFetch.mockReset();
});

describe("PayPal Orders — createPayPalOrder", () => {
  it("creates order with correct amount conversion (cents to dollars)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ id: "PP-ORDER-123", status: "CREATED" }),
    });

    const { createPayPalOrder } = await import("../orders");
    const result = await createPayPalOrder({
      amountCents: 5800,
      currency: "USD",
      orderId: "app-order-456",
    });

    expect(result.id).toBe("PP-ORDER-123");

    // Verify the request body
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("https://api-m.sandbox.paypal.com/v2/checkout/orders");
    expect(options.method).toBe("POST");
    expect(options.headers.Authorization).toBe("Bearer mock-access-token");

    const body = JSON.parse(options.body);
    expect(body.intent).toBe("CAPTURE");
    expect(body.purchase_units[0].amount.currency_code).toBe("USD");
    expect(body.purchase_units[0].amount.value).toBe("58.00"); // 5800 cents → $58.00
    expect(body.purchase_units[0].reference_id).toBe("app-order-456");
  });

  it("converts fractional cents correctly", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ id: "PP-ORDER-789" }),
    });

    const { createPayPalOrder } = await import("../orders");
    await createPayPalOrder({
      amountCents: 1999,
      currency: "USD",
      orderId: "order-abc",
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.purchase_units[0].amount.value).toBe("19.99");
  });

  it("converts zero amount correctly", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ id: "PP-ORDER-FREE" }),
    });

    const { createPayPalOrder } = await import("../orders");
    await createPayPalOrder({
      amountCents: 0,
      currency: "USD",
      orderId: "order-free",
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.purchase_units[0].amount.value).toBe("0.00");
  });

  it("passes through different currencies", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ id: "PP-MYR" }),
    });

    const { createPayPalOrder } = await import("../orders");
    await createPayPalOrder({
      amountCents: 10000,
      currency: "MYR",
      orderId: "order-myr",
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.purchase_units[0].amount.currency_code).toBe("MYR");
  });

  it("throws on PayPal API error with status and body", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      text: async () => JSON.stringify({ name: "UNPROCESSABLE_ENTITY", message: "Invalid currency" }),
    });

    const { createPayPalOrder } = await import("../orders");
    await expect(
      createPayPalOrder({ amountCents: 100, currency: "INVALID", orderId: "order-bad" }),
    ).rejects.toThrow("PayPal create order failed (422)");
  });

  it("throws on network failure", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const { createPayPalOrder } = await import("../orders");
    await expect(
      createPayPalOrder({ amountCents: 100, currency: "USD", orderId: "order-net" }),
    ).rejects.toThrow("Network error");
  });
});

describe("PayPal Orders — capturePayPalOrder", () => {
  it("captures order and returns result", async () => {
    const captureBody = {
      id: "PP-ORDER-123",
      status: "COMPLETED",
      purchase_units: [{ reference_id: "app-order-456" }],
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => captureBody,
      text: async () => JSON.stringify(captureBody),
    });

    const { capturePayPalOrder } = await import("../orders");
    const result = await capturePayPalOrder("PP-ORDER-123");

    expect(result.id).toBe("PP-ORDER-123");
    expect(result.status).toBe("COMPLETED");
    expect(result.purchase_units[0].reference_id).toBe("app-order-456");

    // Verify correct endpoint
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("https://api-m.sandbox.paypal.com/v2/checkout/orders/PP-ORDER-123/capture");
    expect(options.method).toBe("POST");
    expect(options.headers.Authorization).toBe("Bearer mock-access-token");
  });

  it("throws on capture failure", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      text: async () => JSON.stringify({ name: "RESOURCE_NOT_FOUND" }),
    });

    const { capturePayPalOrder } = await import("../orders");
    await expect(capturePayPalOrder("INVALID-ID")).rejects.toThrow("PayPal capture failed");
  });
});
