import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * PayPal OAuth2 Client Tests
 *
 * Tests token fetching, caching, error handling, and credential validation.
 * Uses fetch mocks since PayPal API is external.
 */

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Reset module cache between tests to clear the cached token
beforeEach(() => {
  vi.resetModules();
  mockFetch.mockReset();
  process.env.PAYPAL_CLIENT_ID = "test-client-id";
  process.env.PAYPAL_CLIENT_SECRET = "test-client-secret";
  process.env.PAYPAL_API_URL = "https://api-m.sandbox.paypal.com";
});

afterEach(() => {
  delete process.env.PAYPAL_CLIENT_ID;
  delete process.env.PAYPAL_CLIENT_SECRET;
  delete process.env.PAYPAL_API_URL;
});

function mockTokenResponse(token = "test-access-token", expiresIn = 3600) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ access_token: token, expires_in: expiresIn }),
  });
}

describe("PayPal Client — getPayPalAccessToken", () => {
  it("fetches a new token with correct credentials", async () => {
    mockTokenResponse();
    const { getPayPalAccessToken } = await import("../client");

    const token = await getPayPalAccessToken();

    expect(token).toBe("test-access-token");
    expect(mockFetch).toHaveBeenCalledOnce();

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("https://api-m.sandbox.paypal.com/v1/oauth2/token");
    expect(options.method).toBe("POST");
    expect(options.headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
    expect(options.body).toBe("grant_type=client_credentials");

    // Verify Basic Auth header
    const expectedAuth = Buffer.from("test-client-id:test-client-secret").toString("base64");
    expect(options.headers.Authorization).toBe(`Basic ${expectedAuth}`);
  });

  it("returns cached token on subsequent calls", async () => {
    mockTokenResponse("cached-token", 7200);
    const { getPayPalAccessToken } = await import("../client");

    const token1 = await getPayPalAccessToken();
    const token2 = await getPayPalAccessToken();

    expect(token1).toBe("cached-token");
    expect(token2).toBe("cached-token");
    expect(mockFetch).toHaveBeenCalledOnce(); // Only 1 fetch, not 2
  });

  it("throws when credentials are missing", async () => {
    delete process.env.PAYPAL_CLIENT_ID;
    const { getPayPalAccessToken } = await import("../client");

    await expect(getPayPalAccessToken()).rejects.toThrow("PayPal credentials not configured");
  });

  it("throws when client secret is missing", async () => {
    delete process.env.PAYPAL_CLIENT_SECRET;
    const { getPayPalAccessToken } = await import("../client");

    await expect(getPayPalAccessToken()).rejects.toThrow("PayPal credentials not configured");
  });

  it("throws when API URL is missing", async () => {
    delete process.env.PAYPAL_API_URL;
    const { getPayPalAccessToken } = await import("../client");

    await expect(getPayPalAccessToken()).rejects.toThrow("PayPal credentials not configured");
  });

  it("throws on OAuth failure response", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });
    const { getPayPalAccessToken } = await import("../client");

    await expect(getPayPalAccessToken()).rejects.toThrow("PayPal OAuth failed: 401");
  });
});

describe("PayPal Client — getPayPalApiUrl", () => {
  it("returns configured API URL", async () => {
    const { getPayPalApiUrl } = await import("../client");
    expect(getPayPalApiUrl()).toBe("https://api-m.sandbox.paypal.com");
  });

  it("defaults to sandbox when not configured", async () => {
    delete process.env.PAYPAL_API_URL;
    const { getPayPalApiUrl } = await import("../client");
    expect(getPayPalApiUrl()).toBe("https://api-m.sandbox.paypal.com");
  });
});
