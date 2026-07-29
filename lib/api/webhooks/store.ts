/**
 * Webhook endpoint persistence for the settings UI.
 *
 * Workspace-ADMIN-only by convention of the callers (the "use server" actions
 * in app/(app)/settings/webhooks/actions.ts, which resolve `requireAdmin()`
 * before calling anything here) — a webhook secret can forge a validly-signed
 * event for anything downstream trusts, and one endpoint receives every
 * matching event for the whole site, not one member's slice of it. This
 * module itself does not re-derive that check; like lib/api/keys.ts, it takes
 * `siteId` as an explicit parameter and trusts the caller to have resolved it
 * from an authenticated, authorized session.
 *
 * No "use server" directive — see lib/api/keys.ts / lib/integrations/actions.ts
 * for why: an export here would otherwise be a client-callable endpoint that
 * skipped the admin check entirely.
 */
import { randomBytes } from "crypto";
import { webhookEndpointTable, webhookDeliveryTable, isApiSchemaReady } from "../db";
import type { WebhookEndpointRecord } from "../db";
import { encryptToken, decryptToken } from "@/lib/integrations/crypto";
import { assertSafeWebhookUrl } from "./ssrf-guard";
import { signWebhookPayload, WEBHOOK_EVENT_HEADER, WEBHOOK_SIGNATURE_HEADER, WEBHOOK_TIMESTAMP_HEADER, WEBHOOK_DELIVERY_ID_HEADER } from "./signature";
import { webhookEndpointSchema, WEBHOOK_EVENTS } from "../schemas";
import type { WebhookEndpointInput, WebhookEvent } from "../schemas";

export type WebhookEndpointSummary = Omit<WebhookEndpointRecord, "secretCiphertext">;

function toSummary(record: WebhookEndpointRecord): WebhookEndpointSummary {
  const { secretCiphertext: _secretCiphertext, ...summary } = record;
  return summary;
}

function generateSecret(): string {
  return `whsec_${randomBytes(24).toString("base64url")}`;
}

export async function listWebhookEndpoints(siteId: string): Promise<WebhookEndpointSummary[]> {
  if (!isApiSchemaReady()) return [];
  const rows = await webhookEndpointTable().findMany({
    where: { siteId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toSummary);
}

export async function createWebhookEndpoint(
  siteId: string,
  createdById: string,
  input: WebhookEndpointInput
): Promise<{ endpoint: WebhookEndpointSummary; secret: string }> {
  if (!isApiSchemaReady()) throw new Error("API_SCHEMA_NOT_READY");

  const parsed = webhookEndpointSchema.parse(input);
  await assertSafeWebhookUrl(parsed.url); // Throws UnsafeWebhookUrlError with a user-facing message.

  const secret = generateSecret();
  const record = await webhookEndpointTable().create({
    data: {
      siteId,
      url: parsed.url,
      description: parsed.description ?? null,
      events: parsed.events,
      secretCiphertext: encryptToken(secret),
      enabled: true,
      consecutiveFailures: 0,
      disabledReason: null,
      lastSuccessAt: null,
      lastFailureAt: null,
      createdById,
    },
  });

  return { endpoint: toSummary(record), secret };
}

export type UpdateWebhookEndpointInput = {
  url?: string;
  description?: string | null;
  events?: WebhookEvent[];
  enabled?: boolean;
};

export async function updateWebhookEndpoint(
  siteId: string,
  endpointId: string,
  input: UpdateWebhookEndpointInput
): Promise<WebhookEndpointSummary> {
  if (!isApiSchemaReady()) throw new Error("API_SCHEMA_NOT_READY");

  const existing = await webhookEndpointTable().findUnique({ where: { id: endpointId } });
  if (!existing || existing.siteId !== siteId) throw new Error("WEBHOOK_ENDPOINT_NOT_FOUND");

  if (input.url && input.url !== existing.url) {
    await assertSafeWebhookUrl(input.url);
  }
  if (input.events) {
    const invalid = input.events.filter((e) => !(WEBHOOK_EVENTS as readonly string[]).includes(e));
    if (invalid.length > 0) throw new Error("INVALID_EVENT");
  }

  const data: Record<string, unknown> = {};
  if (input.url !== undefined) data.url = input.url;
  if (input.description !== undefined) data.description = input.description;
  if (input.events !== undefined) data.events = input.events;
  if (input.enabled !== undefined) {
    data.enabled = input.enabled;
    // Re-enabling clears the auto-disable reason and gives the endpoint a
    // clean failure count — otherwise one stale failure streak from before
    // the fix could immediately re-trip MAX_CONSECUTIVE_FAILURES.
    if (input.enabled) {
      data.disabledReason = null;
      data.consecutiveFailures = 0;
    }
  }

  const updated = await webhookEndpointTable().update({ where: { id: endpointId }, data });
  return toSummary(updated);
}

export async function deleteWebhookEndpoint(siteId: string, endpointId: string): Promise<void> {
  if (!isApiSchemaReady()) throw new Error("API_SCHEMA_NOT_READY");

  const existing = await webhookEndpointTable().findUnique({ where: { id: endpointId } });
  if (!existing || existing.siteId !== siteId) throw new Error("WEBHOOK_ENDPOINT_NOT_FOUND");

  // Deliveries are cleaned up explicitly rather than relied on to cascade:
  // the proposed schema (.plan/api-schema.prisma) declares
  // `onDelete: Cascade` on WebhookDelivery.endpoint, but the hand-rolled
  // Delegate in lib/api/db.ts (in use until that schema lands) has no
  // foreign-key awareness at all, so an orphaned WebhookDelivery row would
  // otherwise sit around forever, unreachable from the settings UI.
  await webhookDeliveryTable().deleteMany({ where: { endpointId } });
  await webhookEndpointTable().deleteMany({ where: { id: endpointId, siteId } });
}

/** New plaintext secret for an existing endpoint. The old one stops verifying immediately. */
export async function rotateWebhookSecret(siteId: string, endpointId: string): Promise<string> {
  if (!isApiSchemaReady()) throw new Error("API_SCHEMA_NOT_READY");

  const existing = await webhookEndpointTable().findUnique({ where: { id: endpointId } });
  if (!existing || existing.siteId !== siteId) throw new Error("WEBHOOK_ENDPOINT_NOT_FOUND");

  const secret = generateSecret();
  await webhookEndpointTable().updateMany({
    where: { id: endpointId, siteId },
    data: { secretCiphertext: encryptToken(secret) },
  });
  return secret;
}

export async function listRecentDeliveries(siteId: string, endpointId: string, limit = 20) {
  if (!isApiSchemaReady()) return [];
  const endpoint = await webhookEndpointTable().findUnique({ where: { id: endpointId } });
  if (!endpoint || endpoint.siteId !== siteId) throw new Error("WEBHOOK_ENDPOINT_NOT_FOUND");

  return webhookDeliveryTable().findMany({
    where: { endpointId },
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 100),
  });
}

/**
 * Sends one synchronous, non-retried test event so an admin gets immediate
 * pass/fail feedback in the UI. Deliberately NOT recorded as a
 * `WebhookDelivery` row — it is a connectivity check, not a real event, and
 * mixing it into delivery history would misrepresent the endpoint's real
 * success rate.
 */
export async function sendTestWebhookEvent(
  siteId: string,
  endpointId: string
): Promise<{ success: boolean; status: number | null; error: string | null }> {
  if (!isApiSchemaReady()) throw new Error("API_SCHEMA_NOT_READY");

  const endpoint = await webhookEndpointTable().findUnique({ where: { id: endpointId } });
  if (!endpoint || endpoint.siteId !== siteId) throw new Error("WEBHOOK_ENDPOINT_NOT_FOUND");

  try {
    await assertSafeWebhookUrl(endpoint.url);
  } catch (err) {
    return { success: false, status: null, error: err instanceof Error ? err.message : "URL validation failed." };
  }

  const secret = decryptToken(endpoint.secretCiphertext);
  const timestampSeconds = Math.floor(Date.now() / 1000);
  const body = JSON.stringify({
    event: "webhook.test",
    sentAt: new Date(timestampSeconds * 1000).toISOString(),
    data: { message: "This is a test event from Trackly." },
  });
  const signature = signWebhookPayload(secret, timestampSeconds, body);

  try {
    const response = await fetch(endpoint.url, {
      method: "POST",
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Trackly-Webhooks/1.0",
        [WEBHOOK_EVENT_HEADER]: "webhook.test",
        [WEBHOOK_DELIVERY_ID_HEADER]: "test",
        [WEBHOOK_TIMESTAMP_HEADER]: String(timestampSeconds),
        [WEBHOOK_SIGNATURE_HEADER]: signature,
      },
      body,
    });

    if (response.type === "opaqueredirect") {
      return { success: false, status: null, error: "The endpoint responded with a redirect, which is not followed." };
    }
    return {
      success: response.status >= 200 && response.status < 300,
      status: response.status,
      error: response.ok ? null : `Endpoint responded with HTTP ${response.status}.`,
    };
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "TimeoutError";
    return { success: false, status: null, error: timedOut ? "Request timed out." : "Could not reach the endpoint." };
  }
}
