/**
 * API token minting and verification.
 *
 * Format:  trk_<43 chars base64url>          (32 bytes of CSPRNG entropy)
 * Stored:  sha256(token) hex, unique-indexed, plus a display-only prefix.
 *
 * Why SHA-256 and not bcrypt/argon2
 * ---------------------------------
 * Password hashing is slow *on purpose* because a human-chosen password has
 * maybe 30 bits of entropy and must survive an offline dictionary attack. This
 * token has 256 bits from `randomBytes` — there is no dictionary, and an
 * offline attacker holding the hash column gains nothing from a preimage search
 * that will not finish before the heat death of the sun. Meanwhile a per-request
 * bcrypt verify would put ~100ms of CPU on the hot path of every API call and
 * turn the endpoint into its own denial-of-service amplifier.
 *
 * Why the lookup is not a timing risk
 * -----------------------------------
 * Verification is `findUnique({ where: { tokenHash } })` — an index probe on
 * the SHA-256 of what the caller presented. There is no byte-by-byte comparison
 * of a secret anywhere in the path, so there is no early-exit to time. An
 * attacker measuring the probe learns only whether *their own* hash exists,
 * which is the same single bit the HTTP status already tells them, and which is
 * rate-limited. (`timingSafeEqual` is still used where it genuinely matters —
 * webhook signature verification in `lib/api/webhooks/signature.ts`, and the
 * cron secret — because those *do* compare an attacker-supplied value against a
 * stored one.)
 */
import { createHash, randomBytes, timingSafeEqual } from "crypto";

export const TOKEN_PREFIX = "trk_";
/** 32 bytes → 43 base64url chars, no padding. */
const TOKEN_SECRET_BYTES = 32;
const TOKEN_BODY_LENGTH = 43;
/** Characters of the secret kept in cleartext purely so the UI can say which key is which. */
const DISPLAY_PREFIX_LENGTH = 8;

export type MintedToken = {
  /** Full secret. Returned to the creator exactly once and never persisted. */
  token: string;
  tokenHash: string;
  tokenPrefix: string;
};

export function mintToken(): MintedToken {
  const body = randomBytes(TOKEN_SECRET_BYTES).toString("base64url");
  const token = `${TOKEN_PREFIX}${body}`;
  return {
    token,
    tokenHash: hashToken(token),
    tokenPrefix: `${TOKEN_PREFIX}${body.slice(0, DISPLAY_PREFIX_LENGTH)}`,
  };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

const TOKEN_RE = new RegExp(`^${TOKEN_PREFIX}[A-Za-z0-9_-]{${TOKEN_BODY_LENGTH}}$`);

/** Shape check only — cheap rejection before touching the database. */
export function looksLikeToken(value: string): boolean {
  return TOKEN_RE.test(value);
}

/**
 * Pulls the bearer token out of an `Authorization` header.
 *
 * Returns null for anything that is not exactly `Bearer <token>` with a
 * well-formed token. Notably it does NOT accept the token in a query string:
 * query strings land in access logs, browser history and `Referer` headers.
 */
export function parseBearerToken(authorization: string | null): string | null {
  if (!authorization) return null;
  const match = /^Bearer[ ]+([^\s]+)$/.exec(authorization.trim());
  if (!match) return null;
  const token = match[1];
  return looksLikeToken(token) ? token : null;
}

/** Constant-time equality for two strings of secret material. */
export function timingSafeCompare(a: string, b: string): boolean {
  if (!a || !b) return false;
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}
