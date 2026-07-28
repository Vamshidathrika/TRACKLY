/**
 * Inbound webhook authentication and tenant resolution.
 *
 * These endpoints are unauthenticated by definition — there is no session, and
 * the request body is entirely attacker-controllable. Previously the multi-
 * provider route verified nothing at all and passed a literal `"demo-site"`
 * down to the processors, so a forged POST to /api/webhooks/gitlab could drive
 * real tenant-scoped writes (e.g. flipping issues to DONE via a crafted merge
 * event).
 *
 * The signature is therefore doing double duty: it authenticates the delivery
 * AND identifies the tenant. We look up every site that has this provider
 * connected and test the payload against each stored secret; the secret that
 * verifies tells us which workspace the delivery belongs to. A delivery that
 * matches no secret is rejected rather than attributed to a guess.
 */
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { timingSafeCompare } from "@/lib/github";

function hmacHex(algo: "sha1" | "sha256", secret: string, payload: string): string {
  return crypto.createHmac(algo, secret).update(payload).digest("hex");
}

/**
 * Returns true when `rawBody` is a genuine delivery signed with `secret`.
 * Each provider signs differently; an unknown provider fails closed.
 */
function verifyForProvider(
  provider: string,
  headers: Headers,
  rawBody: string,
  secret: string
): boolean {
  switch (provider) {
    case "GITHUB": {
      const sig = headers.get("x-hub-signature-256");
      if (!sig) return false;
      return timingSafeCompare(`sha256=${hmacHex("sha256", secret, rawBody)}`, sig);
    }
    case "GITLAB": {
      // GitLab sends the shared secret verbatim rather than an HMAC.
      const token = headers.get("x-gitlab-token");
      if (!token) return false;
      return timingSafeCompare(secret, token);
    }
    case "BITBUCKET": {
      const sig = headers.get("x-hub-signature");
      if (!sig) return false;
      return timingSafeCompare(`sha256=${hmacHex("sha256", secret, rawBody)}`, sig);
    }
    case "SENTRY": {
      const sig = headers.get("sentry-hook-signature");
      if (!sig) return false;
      return timingSafeCompare(hmacHex("sha256", secret, rawBody), sig);
    }
    case "VERCEL": {
      const sig = headers.get("x-vercel-signature");
      if (!sig) return false;
      return timingSafeCompare(hmacHex("sha1", secret, rawBody), sig);
    }
    default:
      return false;
  }
}

export type WebhookAuthResult =
  | { ok: true; siteId: string }
  | { ok: false; reason: "NOT_CONFIGURED" | "BAD_SIGNATURE" };

export async function authenticateWebhook(
  provider: string,
  headers: Headers,
  rawBody: string
): Promise<WebhookAuthResult> {
  const upper = provider.toUpperCase();

  const candidates = await prisma.siteIntegration.findMany({
    where: { provider: upper, status: "CONNECTED", NOT: { webhookSecret: null } },
    select: { siteId: true, webhookSecret: true },
  });

  if (candidates.length === 0) return { ok: false, reason: "NOT_CONFIGURED" };

  for (const c of candidates) {
    if (c.webhookSecret && verifyForProvider(upper, headers, rawBody, c.webhookSecret)) {
      return { ok: true, siteId: c.siteId };
    }
  }

  return { ok: false, reason: "BAD_SIGNATURE" };
}
