import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * PayPal Capture Order Route Handler Tests
 *
 * Tests the /api/paypal/capture-order endpoint logic:
 * - Auth check (session required)
 * - Order ownership verification
 * - Input validation (orderID + appOrderId required)
 * - Capture result status verification
 * - Ticket issuance delegation
 * - Idempotent processing
 * - Error handling
 */

// ─── Mocks ────────────────────────────────────────────

const mockCapturePayPalOrder = vi.fn();
vi.mock("@/lib/payments/paypal/orders", () => ({
  capturePayPalOrder: (...args: unknown[]) => mockCapturePayPalOrder(...args),
}));

const mockIssueTicketsForOrder = vi.fn();
vi.mock("@/lib/tickets/issue", () => ({
  issueTicketsForOrder: (...args: unknown[]) => mockIssueTicketsForOrder(...args),
}));

const mockGetDocument = vi.fn();
const mockAccountGet = vi.fn();
vi.mock("@/lib/appwrite/server", () => ({
  createSessionClient: () =>
    Promise.resolve({
      account: { get: () => mockAccountGet() },
    }),
  createAdminClient: () =>
    Promise.resolve({
      databases: {
        getDocument: (...args: unknown[]) => mockGetDocument(...args),
      },
    }),
}));

beforeEach(() => {
  mockCapturePayPalOrder.mockReset();
  mockIssueTicketsForOrder.mockReset();
  mockGetDocument.mockReset();
  mockAccountGet.mockReset();
  // Default — authenticated user owns the order in question
  mockAccountGet.mockResolvedValue({ $id: "user-1" });
  mockGetDocument.mockResolvedValue({ userId: "user-1", $id: "order-default" });
});

function makeRequest(body: Record<string, unknown>) {
  return {
    json: async () => body,
  } as unknown as Request;
}

describe("POST /api/paypal/capture-order", () => {
  it("rejects missing orderID", async () => {
    const { POST } = await import("@/app/api/paypal/capture-order/route");
    const res = await POST(makeRequest({ appOrderId: "order-1" }) as never);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Invalid input");
  });

  it("rejects missing appOrderId", async () => {
    const { POST } = await import("@/app/api/paypal/capture-order/route");
    const res = await POST(makeRequest({ orderID: "PP-123" }) as never);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Invalid input");
  });

  it("rejects empty strings", async () => {
    const { POST } = await import("@/app/api/paypal/capture-order/route");
    const res = await POST(makeRequest({ orderID: "", appOrderId: "" }) as never);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Invalid input");
  });

  it("returns 404 when the order belongs to a different user", async () => {
    mockGetDocument.mockResolvedValueOnce({
      $id: "order-1",
      userId: "someone-else",
    });

    const { POST } = await import("@/app/api/paypal/capture-order/route");
    const res = await POST(
      makeRequest({ orderID: "PP-123", appOrderId: "order-1" }) as never,
    );

    expect(res.status).toBe(404);
  });

  it("returns error when capture status is not COMPLETED", async () => {
    mockGetDocument.mockResolvedValueOnce({ $id: "order-1", userId: "user-1" });
    mockCapturePayPalOrder.mockResolvedValueOnce({
      id: "PP-123",
      status: "VOIDED",
      purchase_units: [],
    });

    const { POST } = await import("@/app/api/paypal/capture-order/route");
    const res = await POST(
      makeRequest({ orderID: "PP-123", appOrderId: "order-1" }) as never,
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Payment not completed");
  });

  it("issues tickets on successful capture", async () => {
    mockGetDocument.mockResolvedValueOnce({ $id: "order-2", userId: "user-1" });
    mockCapturePayPalOrder.mockResolvedValueOnce({
      id: "PP-456",
      status: "COMPLETED",
      purchase_units: [{ reference_id: "order-2" }],
    });
    mockIssueTicketsForOrder.mockResolvedValueOnce({
      tickets: [{ $id: "ticket-1" }, { $id: "ticket-2" }],
      alreadyProcessed: false,
    });

    const { POST } = await import("@/app/api/paypal/capture-order/route");
    const res = await POST(
      makeRequest({ orderID: "PP-456", appOrderId: "order-2" }) as never,
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.ticketCount).toBe(2);
    expect(data.alreadyProcessed).toBe(false);
    expect(mockIssueTicketsForOrder).toHaveBeenCalledWith("order-2", "PP-456");
  });

  it("handles idempotent (already processed) orders", async () => {
    mockGetDocument.mockResolvedValueOnce({ $id: "order-3", userId: "user-1" });
    mockCapturePayPalOrder.mockResolvedValueOnce({
      id: "PP-789",
      status: "COMPLETED",
      purchase_units: [{ reference_id: "order-3" }],
    });
    mockIssueTicketsForOrder.mockResolvedValueOnce({
      tickets: [{ $id: "ticket-existing" }],
      alreadyProcessed: true,
    });

    const { POST } = await import("@/app/api/paypal/capture-order/route");
    const res = await POST(
      makeRequest({ orderID: "PP-789", appOrderId: "order-3" }) as never,
    );
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.alreadyProcessed).toBe(true);
  });

  it("returns 500 when PayPal capture throws", async () => {
    mockGetDocument.mockResolvedValueOnce({
      $id: "order-bad",
      userId: "user-1",
    });
    mockCapturePayPalOrder.mockRejectedValueOnce(new Error("Network error"));

    const { POST } = await import("@/app/api/paypal/capture-order/route");
    const res = await POST(
      makeRequest({ orderID: "PP-BAD", appOrderId: "order-bad" }) as never,
    );
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Failed to capture PayPal order");
  });

  it("returns 500 when ticket issuance fails", async () => {
    mockGetDocument.mockResolvedValueOnce({
      $id: "order-ok",
      userId: "user-1",
    });
    mockCapturePayPalOrder.mockResolvedValueOnce({
      id: "PP-OK",
      status: "COMPLETED",
      purchase_units: [{ reference_id: "order-ok" }],
    });
    mockIssueTicketsForOrder.mockRejectedValueOnce(new Error("DB error"));

    const { POST } = await import("@/app/api/paypal/capture-order/route");
    const res = await POST(
      makeRequest({ orderID: "PP-OK", appOrderId: "order-ok" }) as never,
    );

    expect(res.status).toBe(500);
  });
});
