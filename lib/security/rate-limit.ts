/**
 * Simple in-memory rate limiter for Server Actions.
 * Uses a sliding window approach with automatic cleanup.
 *
 * For production at scale, replace with Redis-backed rate limiting.
 * This is sufficient for small-to-mid traffic (< 10k concurrent users).
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean expired entries every 60 seconds
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) store.delete(key);
    }
  }, 60_000);
}

interface RateLimitConfig {
  /** Unique key prefix (e.g., "auth:login") */
  prefix: string;
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

/**
 * Check rate limit for an identifier (e.g., IP or userId).
 * Returns whether the request is allowed and remaining quota.
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig,
): RateLimitResult {
  const key = `${config.prefix}:${identifier}`;
  const now = Date.now();

  const entry = store.get(key);

  // No entry or expired → allow and start fresh
  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, retryAfterMs: 0 };
  }

  // Within window — check count
  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: entry.resetAt - now,
    };
  }

  // Increment and allow
  entry.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    retryAfterMs: 0,
  };
}

// ─── Pre-configured Rate Limiters ────────────────────

/** Auth actions: 5 attempts per 15 minutes */
export function checkAuthRateLimit(identifier: string): RateLimitResult {
  return checkRateLimit(identifier, {
    prefix: "auth",
    maxRequests: 5,
    windowMs: 15 * 60 * 1000,
  });
}

/** Payment actions: 10 attempts per 5 minutes */
export function checkPaymentRateLimit(identifier: string): RateLimitResult {
  return checkRateLimit(identifier, {
    prefix: "payment",
    maxRequests: 10,
    windowMs: 5 * 60 * 1000,
  });
}

/** General API: 60 requests per minute */
export function checkApiRateLimit(identifier: string): RateLimitResult {
  return checkRateLimit(identifier, {
    prefix: "api",
    maxRequests: 60,
    windowMs: 60 * 1000,
  });
}

/** Scanner: 120 scans per minute (rapid scanning at the door) */
export function checkScannerRateLimit(identifier: string): RateLimitResult {
  return checkRateLimit(identifier, {
    prefix: "scanner",
    maxRequests: 120,
    windowMs: 60 * 1000,
  });
}
