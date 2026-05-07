import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * PayPal Create Order Route Handler Tests
 *
 * Tests the /api/paypal/create-order endpoint logic:
 * - Auth check (session required)
 * - Order ownership verification
 * - Input validation
 * - Order status checks
 * - Idempotent reuse of existing PayPal orders
 * - PayPal API call delegation
 * - Error handling
 */

// ─── Mocks ────────────────────────────────────────────

const mockGetDocument = vi.fn();
const mockUpdateDocument = vi.fn();
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
        updateDocument: (...args: unknown[]) => mockUpdateDocument(...args),
      },
    }),
}));

vi.mock("@/lib/appwrite/config", () => ({
  DATABASE_ID: "test-db",
  COLLECTIONS: { ORDERS: "orders" },
}));

const mockCreatePayPalOrder = vi.fn();
vi.mock("@/lib/payments/paypal/orders", () => ({
  createPayPalOrder: (...args: unknown[]) => mockCreatePayPalOrder(...args),
}));

beforeEach(() => {
  mockGetDocument.mockReset();
  mockUpdateDocument.mockReset();
  mockCreatePayPalOrder.mockReset();
  mockAccountGet.mockReset();
  // Default: an authenticated user who owns the order in question
  mockAccountGet.mockResolvedValue({ $id: "user-1" });
});

function makeRequest(body: Record<string, unknown>) {
  return {
    json: async () => body,
  } as unknown as Request;
}

describe("POST /api/paypal/create-order", () => {
  it("rejects missing orderId", async () => {
    const { POST } = await import("@/app/api/paypal/create-order/route");
    const res = await POST(makeRequest({}) as never);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Invalid input");
  });

  it("rejects empty orderId", async () => {
    const { POST } = await import("@/app/api/paypal/create-order/route");
    const res = await POST(makeRequest({ orderId: "" }) as never);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Invalid input");
  });

  it("returns 404 when the order belongs to a different user", async () => {
    mockGetDocument.mockResolvedValueOnce({
      $id: "order-1",
      userId: "someone-else",
      status: "pending",
      amount: 5800,
      currency: "USD",
    });

    const { POST } = await import("@/app/api/paypal/create-order/route");
    const res = await POST(makeRequest({ orderId: "order-1" }) as never);

    expect(res.status).toBe(404);
  });

  it("rejects order that is not pending", async () => {
    mockGetDocument.mockResolvedValueOnce({
      $id: "order-1",
      userId: "user-1",
      status: "paid",
      amount: 5800,
      currency: "USD",
    });

    const { POST } = await import("@/app/api/paypal/create-order/route");
    const res = await POST(makeRequest({ orderId: "order-1" }) as never);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Order is not pending");
  });

  it("reuses existing PayPal order when providerRef is set", async () => {
    mockGetDocument.mockResolvedValueOnce({
      $id: "order-1",
      userId: "user-1",
      status: "pending",
      amount: 5800,
      currency: "USD",
      providerRef: "PP-EXISTING-123",
    });

    const { POST } = await import("@/app/api/paypal/create-order/route");
    const res = await POST(makeRequest({ orderId: "order-1" }) as never);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.id).toBe("PP-EXISTING-123");
    expect(mockCreatePayPalOrder).not.toHaveBeenCalled();
  });

  it("does NOT reuse providerRef that starts with pending_", async () => {
    mockGetDocument.mockResolvedValueOnce({
      $id: "order-1",
      userId: "user-1",
      status: "pending",
      amount: 5800,
      currency: "USD",
      providerRef: "pending_order-1",
    });
    mockCreatePayPalOrder.mockResolvedValueOnce({ id: "PP-NEW-456" });
    mockUpdateDocument.mockResolvedValueOnce({});

    const { POST } = await import("@/app/api/paypal/create-order/route");
    const res = await POST(makeRequest({ orderId: "order-1" }) as never);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.id).toBe("PP-NEW-456");
    expect(mockCreatePayPalOrder).toHaveBeenCalledOnce();
  });

  it("creates PayPal order with correct amount and currency", async () => {
    mockGetDocument.mockResolvedValueOnce({
      $id: "order-2",
      userId: "user-1",
      status: "pending",
      amount: 10750,
      currency: "USD",
      providerRef: "pending_order-2",
    });
    mockCreatePayPalOrder.mockResolvedValueOnce({ id: "PP-ORDER-789" });
    mockUpdateDocument.mockResolvedValueOnce({});

    const { POST } = await import("@/app/api/paypal/create-order/route");
    const res = await POST(makeRequest({ orderId: "order-2" }) as never);
    const data = await res.json();

    expect(data.id).toBe("PP-ORDER-789");
    expect(mockCreatePayPalOrder).toHaveBeenCalledWith({
      amountCents: 10750,
      currency: "USD",
      orderId: "order-2",
    });
  });

  it("updates providerRef in Appwrite after creating PayPal order", async () => {
    mockGetDocument.mockResolvedValueOnce({
      $id: "order-3",
      userId: "user-1",
      status: "pending",
      amount: 5000,
      currency: "USD",
      providerRef: "pending_order-3",
    });
    mockCreatePayPalOrder.mockResolvedValueOnce({ id: "PP-ORDER-ABC" });
    mockUpdateDocument.mockResolvedValueOnce({});

    const { POST } = await import("@/app/api/paypal/create-order/route");
    await POST(makeRequest({ orderId: "order-3" }) as never);

    expect(mockUpdateDocument).toHaveBeenCalledWith(
      "test-db",
      "orders",
      "order-3",
      { providerRef: "PP-ORDER-ABC" },
    );
  });

  it("returns 500 when PayPal API fails", async () => {
    mockGetDocument.mockResolvedValueOnce({
      $id: "order-4",
      userId: "user-1",
      status: "pending",
      amount: 5000,
      currency: "USD",
      providerRef: "pending_order-4",
    });
    mockCreatePayPalOrder.mockRejectedValueOnce(new Error("PayPal API error"));

    const { POST } = await import("@/app/api/paypal/create-order/route");
    const res = await POST(makeRequest({ orderId: "order-4" }) as never);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Failed to create PayPal order");
  });

  it("returns 500 when Appwrite document fetch fails", async () => {
    mockGetDocument.mockRejectedValueOnce(new Error("Document not found"));

    const { POST } = await import("@/app/api/paypal/create-order/route");
    const res = await POST(makeRequest({ orderId: "nonexistent" }) as never);

    expect(res.status).toBe(500);
  });
});
