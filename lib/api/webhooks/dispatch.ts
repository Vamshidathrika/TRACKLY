/**
 * Outbound webhook delivery: fan-out, signing, SSRF-guarded HTTP, and retry
 * with backoff.
 *
 * There is no message queue in this deployment, so delivery is a two-tier
 * best-effort system built entirely on Postgres/CockroachDB rows:
 *
 *   1. `triggerWebhookEvent` is called synchronously from the /api/v1 write
 *      handler that just committed a change (lib/api/webhooks db.ts models).
 *      It writes one `WebhookDelivery` row per matching enabled endpoint —
 *      that row existing is the durable fact that delivery is owed, even if
 *      the process crashes one line later — then schedules a first attempt
 *      via `after()` (next/server) so it runs after the response has already
 *      been sent to the API caller and does not add webhook-fan-out latency
 *      to their request.
 *   2. `processDueWebhookRetries` re-attempts anything still PENDING/FAILED
 *      whose `nextAttemptAt` has passed. Nothing in this codebase calls it on
 *      a timer — it is exposed by `app/api/v1/webhooks/retry-due/route.ts`
 *      for an external scheduler (see that file's header for why, and what
 *      is NOT wired up yet).
 *
 * A delivery that fails is never retried tighter than the schedule below, and
 * an endpoint that fails MAX_CONSECUTIVE_FAILURES times in a row is disabled
 * automatically — a dead URL must not accumulate an unbounded, ever-growing
 * backlog of queued attempts against this workspace's data.
 */
import { after } from "next/server";
import type { Prisma } from "@prisma/client";
import { webhookEndpointTable, webhookDeliveryTable, isApiSchemaReady } from "../db";
import type { WebhookDeliveryRecord, WebhookEndpointRecord } from "../db";
import { decryptToken } from "@/lib/integrations/crypto";
import { assertSafeWebhookUrl, UnsafeWebhookUrlError } from "./ssrf-guard";
import {
  signWebhookPayload,
  WEBHOOK_DELIVERY_ID_HEADER,
  WEBHOOK_EVENT_HEADER,
  WEBHOOK_SIGNATURE_HEADER,
  WEBHOOK_TIMESTAMP_HEADER,
} from "./signature";
import type { WebhookEvent } from "../schemas";

/** Delay before each retry, indexed by attempt number (0 = first attempt, fired immediately). */
const BACKOFF_MS = [0, 60_000, 5 * 60_000, 30 * 60_000, 2 * 60 * 60_000, 12 * 60 * 60_000];
const MAX_ATTEMPTS = BACKOFF_MS.length;
/** Consecutive failed/exhausted deliveries before an endpoint is auto-disabled. */
const MAX_CONSECUTIVE_FAILURES = 20;
const DELIVERY_TIMEOUT_MS = 10_000;
/** 256 KiB — generous for an issue payload, bounded so a delivery can never balloon. */
const MAX_PAYLOAD_BYTES = 256 * 1024;

/**
 * Fans an event out to every enabled endpoint on `siteId` subscribed to it.
 * Best-effort and non-throwing by design: a webhook subscriber being slow,
 * unreachable, or misconfigured must never fail the API write that triggered
 * it. Errors are logged, never propagated to the caller.
 */
export function triggerWebhookEvent(siteId: string, event: WebhookEvent, payload: Record<string, unknown>): void {
  if (!isApiSchemaReady()) return; // Feature not provisioned on this deployment yet.

  const run = async () => {
    try {
      const endpoints = await webhookEndpointTable().findMany({
        where: { siteId, enabled: true, events: { has: event } },
      });

      for (const endpoint of endpoints) {
        const delivery = await webhookDeliveryTable().create({
          data: {
            siteId,
            endpointId: endpoint.id,
            event,
            payload: payload as Prisma.InputJsonValue,
            status: "PENDING",
            attempt: 0,
            maxAttempts: MAX_ATTEMPTS,
            nextAttemptAt: new Date(),
          },
        });
        await attemptDelivery(delivery, endpoint);
      }
    } catch (err) {
      console.error(`[webhooks] failed to fan out event=${event} siteId=${siteId}:`, err);
    }
  };

  // `after()` throws when called outside a request/render lifecycle (e.g. a
  // future non-HTTP caller). Fall back to a detached call rather than losing
  // the event — `run()` itself never throws past its own try/catch.
  try {
    after(run);
  } catch {
    void run();
  }
}

/**
 * Performs (or re-performs) one delivery attempt and persists the outcome.
 * Exported separately from `triggerWebhookEvent` so the retry sweep can call
 * it directly on an existing row without re-deriving the endpoint list.
 */
export async function attemptDelivery(
  delivery: WebhookDeliveryRecord,
  endpoint: WebhookEndpointRecord
): Promise<void> {
  const attempt = delivery.attempt + 1;
  const body = JSON.stringify(delivery.payload);

  if (Buffer.byteLength(body, "utf8") > MAX_PAYLOAD_BYTES) {
    await markOutcome(delivery, endpoint, {
      ok: false,
      attempt,
      errorCode: "payload_too_large",
      responseStatus: null,
    });
    return;
  }

  let secret: string;
  try {
    secret = decryptToken(endpoint.secretCiphertext);
    if (!secret) throw new Error("empty secret");
  } catch {
    await markOutcome(delivery, endpoint, {
      ok: false,
      attempt,
      errorCode: "secret_unavailable",
      responseStatus: null,
    });
    return;
  }

  // Re-validated on every attempt, not only at registration — see
  // ssrf-guard.ts's header comment on DNS rebinding as a slow attack.
  try {
    await assertSafeWebhookUrl(endpoint.url);
  } catch (err) {
    const code = err instanceof UnsafeWebhookUrlError ? "unsafe_url" : "url_validation_failed";
    await markOutcome(delivery, endpoint, { ok: false, attempt, errorCode: code, responseStatus: null });
    return;
  }

  const timestampSeconds = Math.floor(Date.now() / 1000);
  const signature = signWebhookPayload(secret, timestampSeconds, body);

  try {
    const response = await fetch(endpoint.url, {
      method: "POST",
      // Manual redirect handling is load-bearing: a validated public URL
      // that 302s to an internal address is the standard SSRF bypass this
      // guard exists to close. A redirect response is treated as a failure,
      // never followed.
      redirect: "manual",
      signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Trackly-Webhooks/1.0",
        [WEBHOOK_EVENT_HEADER]: delivery.event,
        [WEBHOOK_DELIVERY_ID_HEADER]: delivery.id,
        [WEBHOOK_TIMESTAMP_HEADER]: String(timestampSeconds),
        [WEBHOOK_SIGNATURE_HEADER]: signature,
      },
      body,
    });

    // `redirect: "manual"` surfaces a 3xx as an "opaqueredirect" response
    // (status 0, type opaqueredirect) rather than throwing — treat it the
    // same as any other non-2xx.
    const ok = response.type !== "opaqueredirect" && response.status >= 200 && response.status < 300;
    await markOutcome(delivery, endpoint, {
      ok,
      attempt,
      responseStatus: response.type === "opaqueredirect" ? null : response.status,
      errorCode: ok ? null : response.type === "opaqueredirect" ? "unsafe_redirect" : `http_${response.status}`,
    });
  } catch (err) {
    const errorCode = err instanceof Error && err.name === "TimeoutError" ? "timeout" : "network_error";
    await markOutcome(delivery, endpoint, { ok: false, attempt, errorCode, responseStatus: null });
  }
}

async function markOutcome(
  delivery: WebhookDeliveryRecord,
  endpoint: WebhookEndpointRecord,
  outcome: { ok: boolean; attempt: number; responseStatus: number | null; errorCode: string | null }
): Promise<void> {
  const now = new Date();

  if (outcome.ok) {
    await webhookDeliveryTable().update({
      where: { id: delivery.id },
      data: {
        status: "DELIVERED",
        attempt: outcome.attempt,
        responseStatus: outcome.responseStatus,
        errorCode: null,
        deliveredAt: now,
        nextAttemptAt: null,
      },
    });
    await webhookEndpointTable().update({
      where: { id: endpoint.id },
      data: { consecutiveFailures: 0, lastSuccessAt: now, disabledReason: null },
    });
    return;
  }

  const exhausted = outcome.attempt >= delivery.maxAttempts;
  await webhookDeliveryTable().update({
    where: { id: delivery.id },
    data: {
      status: exhausted ? "EXHAUSTED" : "FAILED",
      attempt: outcome.attempt,
      responseStatus: outcome.responseStatus,
      errorCode: outcome.errorCode,
      nextAttemptAt: exhausted ? null : new Date(now.getTime() + BACKOFF_MS[outcome.attempt]),
    },
  });

  const consecutiveFailures = endpoint.consecutiveFailures + 1;
  const shouldDisable = consecutiveFailures >= MAX_CONSECUTIVE_FAILURES;
  await webhookEndpointTable().update({
    where: { id: endpoint.id },
    data: {
      consecutiveFailures,
      lastFailureAt: now,
      ...(shouldDisable
        ? {
            enabled: false,
            disabledReason: `Disabled automatically after ${MAX_CONSECUTIVE_FAILURES} consecutive failed deliveries.`,
          }
        : {}),
    },
  });
}

/**
 * Re-attempts every delivery whose retry is due. Intended to be called by an
 * external scheduler via `app/api/v1/webhooks/retry-due/route.ts`, not by
 * anything in the request path — see that route's header for the operational
 * gap this leaves (no scheduler is configured in this repo).
 */
export async function processDueWebhookRetries(limit = 25): Promise<{ processed: number }> {
  if (!isApiSchemaReady()) return { processed: 0 };

  const due = await webhookDeliveryTable().findMany({
    where: { status: { in: ["PENDING", "FAILED"] }, nextAttemptAt: { lte: new Date() } },
    orderBy: { nextAttemptAt: "asc" },
    take: limit,
  });

  let processed = 0;
  for (const delivery of due) {
    const endpoint = await webhookEndpointTable().findUnique({ where: { id: delivery.endpointId } });
    if (!endpoint || !endpoint.enabled) {
      // Endpoint was deleted or disabled since this delivery was queued —
      // nothing left to retry against.
      await webhookDeliveryTable().update({
        where: { id: delivery.id },
        data: { status: "EXHAUSTED", errorCode: "endpoint_unavailable", nextAttemptAt: null },
      });
      continue;
    }
    await attemptDelivery(delivery, endpoint);
    processed += 1;
  }

  return { processed };
}
