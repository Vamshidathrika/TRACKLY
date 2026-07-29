/**
 * Bearer-token authentication for `/api/v1`.
 *
 * **There is no session fallback here, on purpose.** `/api/v1` is not covered by
 * the NextAuth middleware matcher and never calls `auth()` / `getAuthUser()`.
 * If it did, every endpoint would become CSRF-reachable from any page the
 * victim's browser loads: a cookie is attached automatically, a bearer token is
 * not. Cookie auth on a JSON write endpoint is the classic way an "API" turns
 * into a one-click issue-deleter.
 *
 * A token resolves to a principal:
 *
 *   ApiKey → (siteId, userId, scopes)
 *          → live Membership(userId, siteId) → Role
 *
 * The membership is re-read on **every** request rather than trusted from the
 * key row. Removing someone from a workspace must kill their tokens
 * immediately; otherwise a departed employee's key keeps working until someone
 * remembers to revoke it by hand.
 */
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";
import { apiError } from "./errors";
import { apiKeyTable } from "./db";
import { hashToken, parseBearerToken } from "./tokens";
import type { ApiScope } from "./scopes";
import { hasScope } from "./scopes";
import {
  AUTH_FAILURE_LIMIT,
  DEFAULT_TOKEN_LIMIT_PER_MINUTE,
  clientIdentifier,
  consumeRateLimit,
  rateLimitKeys,
} from "./rate-limit";

export type ApiContext = {
  keyId: string;
  keyName: string;
  /** The one workspace this token may ever touch. */
  siteId: string;
  /** The user the token acts as. */
  userId: string;
  /** Workspace role, re-read from Membership on every request. */
  role: Role;
  scopes: readonly string[];
  rateLimitPerMinute: number;
  requestId: string;
};

/**
 * `lastUsedAt` is written at most once a minute per key. Updating it on every
 * request would put a write on the hot path of a read-only API and make the key
 * row a contention point for a busy integration.
 */
const LAST_USED_RESOLUTION_MS = 60_000;

export async function authenticateRequest(
  headers: Headers,
  requestId: string
): Promise<ApiContext> {
  const token = parseBearerToken(headers.get("authorization"));

  if (!token) {
    await recordAuthFailure(headers);
    throw apiError.invalidToken();
  }

  const record = await apiKeyTable().findUnique({ where: { tokenHash: hashToken(token) } });

  const now = new Date();
  const usable =
    record !== null &&
    record.revokedAt === null &&
    (record.expiresAt === null || record.expiresAt > now);

  if (!usable || !record) {
    await recordAuthFailure(headers);
    throw apiError.invalidToken();
  }

  // Live membership check — the key row's siteId is only half the story.
  const membership = await prisma.membership.findUnique({
    where: { userId_siteId: { userId: record.userId, siteId: record.siteId } },
    select: { role: true },
  });

  if (!membership) {
    await recordAuthFailure(headers);
    throw apiError.invalidToken();
  }

  void touchLastUsed(record.id, record.lastUsedAt, now);

  return {
    keyId: record.id,
    keyName: record.name,
    siteId: record.siteId,
    userId: record.userId,
    role: membership.role,
    scopes: record.scopes,
    rateLimitPerMinute:
      record.rateLimitPerMinute > 0 ? record.rateLimitPerMinute : DEFAULT_TOKEN_LIMIT_PER_MINUTE,
    requestId,
  };
}

async function touchLastUsed(keyId: string, lastUsedAt: Date | null, now: Date): Promise<void> {
  if (lastUsedAt && now.getTime() - lastUsedAt.getTime() < LAST_USED_RESOLUTION_MS) return;
  try {
    await apiKeyTable().updateMany({ where: { id: keyId }, data: { lastUsedAt: now } });
  } catch (err) {
    // Telemetry must never fail a request.
    console.error("[api/auth] failed to record lastUsedAt:", err);
  }
}

/**
 * Throttles token guessing per source address. Throws 429 once the source has
 * burnt through its failure budget, so a scanner gets a wall rather than an
 * unlimited oracle — but a limiter outage never blocks a legitimate 401.
 */
async function recordAuthFailure(headers: Headers): Promise<void> {
  let result;
  try {
    result = await consumeRateLimit(
      rateLimitKeys.authFailure(clientIdentifier(headers)),
      AUTH_FAILURE_LIMIT
    );
  } catch (err) {
    console.error("[api/auth] auth-failure throttle unavailable:", err);
    return;
  }
  if (!result.allowed) {
    throw apiError.rateLimited(result.retryAfterSeconds);
  }
}

export function requireScope(ctx: ApiContext, scope: ApiScope): void {
  if (!hasScope(ctx.scopes, scope)) {
    throw apiError.insufficientScope(scope);
  }
}
