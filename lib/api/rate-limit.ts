/**
 * Fixed-window rate limiting on Upstash Redis (already a dependency).
 *
 * Two buckets:
 *   - `apiv1:key:<keyId>`  — per-token quota, after authentication.
 *   - `apiv1:authfail:<ip>` — failed authentications per source address, so a
 *     token-guessing loop is throttled even though it never authenticates.
 *
 * The counter is bumped inside a Lua script so INCR and the first EXPIRE are
 * atomic. Without that, a process that dies between `INCR` and `EXPIRE` leaves
 * a key with no TTL and permanently locks that token out. `eval` failures fall
 * back to a pipeline, and a missing/broken Redis falls back to an in-process
 * window.
 *
 * Fail-open, deliberately
 * -----------------------
 * If Redis is unreachable the limiter degrades to the in-process window rather
 * than rejecting traffic. Failing closed would let one Upstash outage take the
 * whole public API down — a bigger incident than the abuse the limiter exists to
 * blunt, given every request is still authenticated and tenant-scoped. The
 * in-process fallback is per-instance, so on a multi-instance deployment the
 * effective limit during an outage is `limit × instances`. That is an accepted
 * degradation and it is logged.
 */
import { redis } from "@/lib/redis";

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Unix seconds at which the current window resets. */
  resetAt: number;
  retryAfterSeconds: number;
};

const WINDOW_SECONDS = 60;

/**
 * KEYS[1] = counter key, ARGV[1] = window seconds.
 * Sets the TTL only on the first increment of a window.
 */
const INCR_SCRIPT = `
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("EXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("TTL", KEYS[1])
if ttl < 0 then
  redis.call("EXPIRE", KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
return {current, ttl}
`;

// ─── In-process fallback ────────────────────────────────────────────────────

const localWindows = new Map<string, { count: number; expiresAt: number }>();

function localIncrement(key: string, windowSeconds: number): { count: number; ttl: number } {
  const now = Date.now();
  const existing = localWindows.get(key);

  if (!existing || existing.expiresAt <= now) {
    const expiresAt = now + windowSeconds * 1000;
    localWindows.set(key, { count: 1, expiresAt });
    if (localWindows.size > 10_000) {
      for (const [k, v] of localWindows) {
        if (v.expiresAt <= now) localWindows.delete(k);
      }
    }
    return { count: 1, ttl: windowSeconds };
  }

  existing.count += 1;
  return { count: existing.count, ttl: Math.ceil((existing.expiresAt - now) / 1000) };
}

/** Test seam — resets the in-process window map. */
export function __resetLocalRateLimitState(): void {
  localWindows.clear();
}

// ─── Public API ─────────────────────────────────────────────────────────────

async function increment(key: string, windowSeconds: number): Promise<{ count: number; ttl: number }> {
  if (!redis) return localIncrement(key, windowSeconds);

  try {
    const result = (await redis.eval(INCR_SCRIPT, [key], [String(windowSeconds)])) as
      | [number, number]
      | null;
    if (Array.isArray(result) && result.length === 2) {
      return { count: Number(result[0]), ttl: Number(result[1]) };
    }
  } catch (err) {
    console.error("[api/rate-limit] eval failed, falling back to pipeline:", err);
  }

  try {
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, windowSeconds);
    const ttl = await redis.ttl(key);
    if (ttl < 0) await redis.expire(key, windowSeconds);
    return { count, ttl: ttl < 0 ? windowSeconds : ttl };
  } catch (err) {
    console.error("[api/rate-limit] redis unavailable, using in-process window:", err);
    return localIncrement(key, windowSeconds);
  }
}

export async function consumeRateLimit(
  bucketKey: string,
  limit: number,
  windowSeconds: number = WINDOW_SECONDS
): Promise<RateLimitResult> {
  const safeLimit = Math.max(1, Math.floor(limit));
  const { count, ttl } = await increment(bucketKey, windowSeconds);
  const effectiveTtl = ttl > 0 ? ttl : windowSeconds;

  return {
    allowed: count <= safeLimit,
    limit: safeLimit,
    remaining: Math.max(0, safeLimit - count),
    resetAt: Math.floor(Date.now() / 1000) + effectiveTtl,
    retryAfterSeconds: effectiveTtl,
  };
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.resetAt),
  };
}

export const rateLimitKeys = {
  token: (keyId: string) => `apiv1:key:${keyId}`,
  authFailure: (clientId: string) => `apiv1:authfail:${clientId}`,
};

/** Failed-auth attempts tolerated from one source address per minute. */
export const AUTH_FAILURE_LIMIT = 20;
/** Default per-token quota when the key does not override it. */
export const DEFAULT_TOKEN_LIMIT_PER_MINUTE = 120;

/**
 * Best-effort client identity for the pre-auth bucket.
 *
 * `x-forwarded-for` is trivially spoofable when the app is exposed directly, so
 * this is a speed bump against a naive scanner, not an authorisation control.
 * The real defence against token guessing is the 256-bit token itself.
 */
export function clientIdentifier(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  return headers.get("x-real-ip")?.slice(0, 64) ?? "unknown";
}
