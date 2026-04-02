/**
 * Rate limiter with pluggable backend.
 * Uses in-memory Map by default; automatically switches to Upstash Redis
 * when UPSTASH_REDIS_REST_URL is configured (for distributed deployments).
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * Pluggable store interface for rate limit state.
 * Default: in-memory Map. Set UPSTASH_REDIS_REST_URL for distributed enforcement.
 */
export interface RateLimitStore {
  get(key: string): RateLimitEntry | undefined | Promise<RateLimitEntry | undefined>;
  set(key: string, entry: RateLimitEntry): void | Promise<void>;
  delete(key: string): void | Promise<void>;
  entries(): IterableIterator<[string, RateLimitEntry]>;
}

/** In-memory store — default for single-instance deployments */
function createMemoryStore(): RateLimitStore {
  const map = new Map<string, RateLimitEntry>();
  return {
    get: (key) => map.get(key),
    set: (key, entry) => { map.set(key, entry); },
    delete: (key) => { map.delete(key); },
    entries: () => map.entries(),
  };
}

/**
 * Upstash Redis store — uses REST API (no dependency needed).
 * Entries auto-expire via Redis TTL, so no cleanup interval required.
 */
function createUpstashStore(url: string, token: string): RateLimitStore {
  const PREFIX = "rl:";

  async function redis(method: string, args: unknown[]): Promise<unknown> {
    const res = await fetch(`${url}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify([method, ...args]),
    });
    const data = await res.json() as { result: unknown };
    return data.result;
  }

  return {
    async get(key: string): Promise<RateLimitEntry | undefined> {
      const raw = await redis("GET", [`${PREFIX}${key}`]) as string | null;
      if (!raw) return undefined;
      try { return JSON.parse(raw) as RateLimitEntry; } catch { return undefined; }
    },
    async set(key: string, entry: RateLimitEntry): Promise<void> {
      const ttlMs = Math.max(entry.resetAt - Date.now(), 1000);
      const ttlSec = Math.ceil(ttlMs / 1000);
      await redis("SET", [`${PREFIX}${key}`, JSON.stringify(entry), "EX", ttlSec]);
    },
    async delete(key: string): Promise<void> {
      await redis("DEL", [`${PREFIX}${key}`]);
    },
    // Redis entries auto-expire; no iteration needed
    entries: () => new Map<string, RateLimitEntry>().entries(),
  };
}

/** Select store based on environment: Upstash if configured, else in-memory */
const store: RateLimitStore = (() => {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    return createUpstashStore(url, token);
  }
  return createMemoryStore();
})();

// Clean expired entries every 60 seconds (in-memory only; Redis uses TTL)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.resetAt <= now) void store.delete(key);
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
 * Async to support Redis-backed stores.
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const key = `${config.prefix}:${identifier}`;
  const now = Date.now();

  const entry = await store.get(key);

  // No entry or expired → allow and start fresh
  if (!entry || entry.resetAt <= now) {
    await store.set(key, { count: 1, resetAt: now + config.windowMs });
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
  await store.set(key, entry);
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    retryAfterMs: 0,
  };
}

// ─── Pre-configured Rate Limiters ────────────────────

/** Auth actions: 10 attempts per 5 minutes */
export function checkAuthRateLimit(identifier: string): Promise<RateLimitResult> {
  return checkRateLimit(identifier, {
    prefix: "auth",
    maxRequests: 10,
    windowMs: 5 * 60 * 1000,
  });
}

/** Payment actions: 10 attempts per 5 minutes */
export function checkPaymentRateLimit(identifier: string): Promise<RateLimitResult> {
  return checkRateLimit(identifier, {
    prefix: "payment",
    maxRequests: 10,
    windowMs: 5 * 60 * 1000,
  });
}

/** General API: 60 requests per minute */
export function checkApiRateLimit(identifier: string): Promise<RateLimitResult> {
  return checkRateLimit(identifier, {
    prefix: "api",
    maxRequests: 60,
    windowMs: 60 * 1000,
  });
}

/** Scanner: 120 scans per minute (rapid scanning at the door) */
export function checkScannerRateLimit(identifier: string): Promise<RateLimitResult> {
  return checkRateLimit(identifier, {
    prefix: "scanner",
    maxRequests: 120,
    windowMs: 60 * 1000,
  });
}

/** Profile updates: 10 per 5 minutes */
export function checkProfileRateLimit(identifier: string): Promise<RateLimitResult> {
  return checkRateLimit(identifier, {
    prefix: "profile",
    maxRequests: 10,
    windowMs: 5 * 60 * 1000,
  });
}

/** Avatar uploads: 5 per 5 minutes */
export function checkAvatarRateLimit(identifier: string): Promise<RateLimitResult> {
  return checkRateLimit(identifier, {
    prefix: "avatar",
    maxRequests: 5,
    windowMs: 5 * 60 * 1000,
  });
}

/** Data export: 1 per hour */
export function checkExportRateLimit(identifier: string): Promise<RateLimitResult> {
  return checkRateLimit(identifier, {
    prefix: "export",
    maxRequests: 1,
    windowMs: 60 * 60 * 1000,
  });
}

/** Sensitive settings (password, email, deletion): 3 per 15 minutes */
export function checkSensitiveRateLimit(identifier: string): Promise<RateLimitResult> {
  return checkRateLimit(identifier, {
    prefix: "sensitive",
    maxRequests: 3,
    windowMs: 15 * 60 * 1000,
  });
}
