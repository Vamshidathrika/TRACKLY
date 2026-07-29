import { describe, it, expect, vi, beforeEach } from "vitest";

// No UPSTASH_* env vars are set in the test environment, so lib/redis.ts's
// `redis` export is already null and consumeRateLimit takes the in-process
// fallback path documented in rate-limit.ts's header comment. Asserting that
// explicitly here (rather than trusting it implicitly) so a future change to
// lib/redis.ts's env-detection doesn't silently start hitting a real Redis
// instance from the test suite.
import { redis } from "@/lib/redis";

import {
  consumeRateLimit,
  rateLimitHeaders,
  rateLimitKeys,
  clientIdentifier,
  __resetLocalRateLimitState,
  AUTH_FAILURE_LIMIT,
  DEFAULT_TOKEN_LIMIT_PER_MINUTE,
} from "./rate-limit";

beforeEach(() => {
  __resetLocalRateLimitState();
});

describe("test environment sanity", () => {
  it("has no Redis configured, so these tests exercise the in-process fallback", () => {
    expect(redis).toBeNull();
  });
});

describe("consumeRateLimit", () => {
  it("allows requests under the limit and reports remaining budget", async () => {
    const key = rateLimitKeys.token("key-a");
    const first = await consumeRateLimit(key, 5);
    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(4);
    expect(first.limit).toBe(5);
  });

  it("blocks once the limit is exceeded and reports a Retry-After", async () => {
    const key = rateLimitKeys.token("key-b");
    for (let i = 0; i < 3; i++) await consumeRateLimit(key, 3);
    const blocked = await consumeRateLimit(key, 3);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("buckets by key — one token's usage never spends another token's budget", async () => {
    const keyA = rateLimitKeys.token("token-A");
    const keyB = rateLimitKeys.token("token-B");
    for (let i = 0; i < 5; i++) await consumeRateLimit(keyA, 5);
    const stillFreshB = await consumeRateLimit(keyB, 5);
    expect(stillFreshB.allowed).toBe(true);
    expect(stillFreshB.remaining).toBe(4);
  });

  it("clamps a non-positive or fractional limit to a safe minimum of 1", async () => {
    const key = rateLimitKeys.token("key-c");
    const result = await consumeRateLimit(key, 0);
    expect(result.limit).toBe(1);
  });
});

describe("rateLimitHeaders", () => {
  it("exposes the standard X-RateLimit-* triad", async () => {
    const result = await consumeRateLimit(rateLimitKeys.token("key-d"), 10);
    const headers = rateLimitHeaders(result);
    expect(headers["X-RateLimit-Limit"]).toBe("10");
    expect(headers["X-RateLimit-Remaining"]).toBe("9");
    expect(headers["X-RateLimit-Reset"]).toBe(String(result.resetAt));
  });
});

describe("rateLimitKeys", () => {
  it("namespaces token and auth-failure buckets separately so they cannot collide", () => {
    expect(rateLimitKeys.token("abc")).toBe("apiv1:key:abc");
    expect(rateLimitKeys.authFailure("1.2.3.4")).toBe("apiv1:authfail:1.2.3.4");
  });
});

describe("clientIdentifier", () => {
  it("prefers the first hop of X-Forwarded-For", () => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" });
    expect(clientIdentifier(headers)).toBe("203.0.113.9");
  });

  it("falls back to X-Real-Ip when X-Forwarded-For is absent", () => {
    const headers = new Headers({ "x-real-ip": "203.0.113.9" });
    expect(clientIdentifier(headers)).toBe("203.0.113.9");
  });

  it("falls back to a constant rather than throwing when neither header is present", () => {
    expect(clientIdentifier(new Headers())).toBe("unknown");
  });

  it("truncates an implausibly long spoofed header rather than using it verbatim", () => {
    const headers = new Headers({ "x-forwarded-for": "a".repeat(200) });
    expect(clientIdentifier(headers).length).toBeLessThanOrEqual(64);
  });
});

describe("documented defaults", () => {
  it("keeps a sane relationship between the auth-failure budget and the default token budget", () => {
    expect(AUTH_FAILURE_LIMIT).toBeGreaterThan(0);
    expect(DEFAULT_TOKEN_LIMIT_PER_MINUTE).toBeGreaterThan(0);
  });
});
