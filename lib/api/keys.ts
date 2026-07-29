/**
 * API key persistence for the settings UI.
 *
 * Ownership model (deliberately mirrors GitHub personal access tokens, not a
 * shared "service account" model):
 *   - Any workspace member may mint their OWN key. The key acts as its
 *     creator — there is no "issue a token as another user" path, which
 *     would otherwise be a straightforward privilege-escalation primitive
 *     (mint a token as the ADMIN, use it as that ADMIN).
 *   - A workspace ADMIN may list and revoke ANY key in the workspace, not
 *     only their own — required for offboarding a departing member or
 *     responding to a leaked-token incident without waiting on that member.
 *   - A non-admin may only list/revoke their own keys.
 *
 * These functions take `siteId` and the acting user's identity as explicit
 * parameters and do NOT resolve them from a session — callers (the "use
 * server" actions in app/(app)/settings/api-keys/actions.ts) are responsible
 * for resolving both from `requireMembership()` and are the only place an
 * unauthenticated or cross-tenant call could otherwise sneak in.
 *
 * No "use server" directive here — see lib/integrations/actions.ts for why
 * that distinction matters: every export of a "use server" file is a public,
 * client-callable endpoint, and `mintToken`'s raw secret must never be
 * reachable by a call that skipped the tenant/ownership checks below.
 */
import { apiKeyTable, isApiSchemaReady } from "./db";
import type { ApiKeyRecord } from "./db";
import { mintToken } from "./tokens";
import { sanitiseScopes } from "./scopes";
import type { ApiScope } from "./scopes";

export type ApiKeySummary = Omit<ApiKeyRecord, "tokenHash">;

function toSummary(record: ApiKeyRecord): ApiKeySummary {
  // tokenHash is dropped even though it is not the plaintext secret — there
  // is no reader that needs it, and every unnecessary copy of a lookup key
  // for the credential table is attack surface a future bug could leak.
  const { tokenHash: _tokenHash, ...summary } = record;
  return summary;
}

const MAX_NAME_LENGTH = 80;
const MAX_RATE_LIMIT_PER_MINUTE = 1_000;
const MAX_EXPIRY_DAYS = 730;

export type CreateApiKeyInput = {
  name: string;
  scopes: readonly string[];
  /** null/undefined = never expires. */
  expiresInDays?: number | null;
  /** 0/undefined = use the platform default. */
  rateLimitPerMinute?: number;
};

export async function createApiKey(
  siteId: string,
  userId: string,
  input: CreateApiKeyInput
): Promise<{ key: ApiKeySummary; token: string }> {
  if (!isApiSchemaReady()) {
    throw new Error("API_SCHEMA_NOT_READY");
  }

  const name = input.name.trim().slice(0, MAX_NAME_LENGTH);
  if (!name) throw new Error("NAME_REQUIRED");

  const scopes: ApiScope[] = sanitiseScopes(input.scopes);
  if (scopes.length === 0) throw new Error("AT_LEAST_ONE_SCOPE_REQUIRED");

  // 0 is a meaningful value here, not "unset" — it means "use whatever the
  // platform default is *at read time*" (lib/api/auth.ts resolves it that
  // way per request), so a future change to DEFAULT_TOKEN_LIMIT_PER_MINUTE
  // applies to every key that never overrode it. Materializing the current
  // default into the row now would silently pin it forever.
  const rawRateLimit = input.rateLimitPerMinute ?? 0;
  const rateLimitPerMinute =
    rawRateLimit > 0 ? Math.min(MAX_RATE_LIMIT_PER_MINUTE, Math.round(rawRateLimit)) : 0;

  const expiresAt =
    input.expiresInDays == null
      ? null
      : new Date(Date.now() + clamp(input.expiresInDays, 1, MAX_EXPIRY_DAYS, 90) * 24 * 60 * 60 * 1000);

  const { token, tokenHash, tokenPrefix } = mintToken();

  const record = await apiKeyTable().create({
    data: {
      siteId,
      userId,
      createdById: userId,
      name,
      tokenHash,
      tokenPrefix,
      scopes,
      rateLimitPerMinute,
      expiresAt,
      lastUsedAt: null,
      revokedAt: null,
      revokedById: null,
    },
  });

  return { key: toSummary(record), token };
}

/** Every key in the workspace (ADMIN) or only the caller's own (member). */
export async function listApiKeys(
  siteId: string,
  requestingUserId: string,
  isWorkspaceAdmin: boolean
): Promise<ApiKeySummary[]> {
  if (!isApiSchemaReady()) return [];

  const rows = await apiKeyTable().findMany({
    where: isWorkspaceAdmin ? { siteId } : { siteId, userId: requestingUserId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toSummary);
}

export async function revokeApiKey(
  siteId: string,
  keyId: string,
  revokingUserId: string,
  isWorkspaceAdmin: boolean
): Promise<void> {
  if (!isApiSchemaReady()) throw new Error("API_SCHEMA_NOT_READY");

  const record = await apiKeyTable().findUnique({ where: { id: keyId } });
  if (!record || record.siteId !== siteId) throw new Error("API_KEY_NOT_FOUND");

  if (!isWorkspaceAdmin && record.userId !== revokingUserId) {
    throw new Error("FORBIDDEN_NOT_KEY_OWNER");
  }
  if (record.revokedAt) return; // Already revoked — idempotent.

  await apiKeyTable().updateMany({
    where: { id: keyId, siteId },
    data: { revokedAt: new Date(), revokedById: revokingUserId },
  });
}

function clamp(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}
