/**
 * `POST /api/v1/webhooks/retry-due` — process every due webhook retry.
 *
 * **This is NOT part of the public API surface.** It takes no bearer token,
 * grants no tenant-scoped access, and returns nothing about any specific
 * workspace's data — it exists purely so an external scheduler can drive
 * `processDueWebhookRetries` (lib/api/webhooks/dispatch.ts), because this
 * deployment has no cron/queue infrastructure of its own. It intentionally
 * does NOT go through `withApi` (lib/api/handler.ts) — that wrapper's
 * authentication is bearer-token-as-a-user, which is the wrong model for a
 * machine-to-machine maintenance trigger with no associated site or user.
 *
 * **Operational gap, not yet closed**: nothing in this repository calls this
 * route on a schedule. `vercel.json` is outside this feature's file area
 * (app/api/v1/**, lib/api/**, the two settings UI directories) and was not
 * touched. Before outbound webhook retries actually happen in production,
 * something must be configured to call this endpoint periodically (a Vercel
 * Cron entry, or any external scheduler) with the `X-Internal-Retry-Secret`
 * header set to `WEBHOOK_RETRY_SECRET`. Until then, first-attempt delivery
 * (fired inline from the write endpoints via `after()`) still works; only
 * retries of a failed first attempt do not happen automatically.
 *
 * Auth: a single shared secret, compared with `timingSafeCompare` (the same
 * primitive `lib/api/tokens.ts` uses for secret comparisons, not `===`).
 * `WEBHOOK_RETRY_SECRET` unset means "this deployment has not opted into the
 * retry sweep" — the route fails closed (503), never open.
 */
import { NextResponse } from "next/server";
import { timingSafeCompare } from "@/lib/api/tokens";
import { processDueWebhookRetries } from "@/lib/api/webhooks/dispatch";

export const RETRY_SECRET_HEADER = "x-internal-retry-secret";

export async function POST(req: Request): Promise<NextResponse> {
  const configuredSecret = process.env.WEBHOOK_RETRY_SECRET;
  if (!configuredSecret) {
    return NextResponse.json(
      { error: { code: "service_unavailable", message: "Webhook retry processing is not configured." } },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  const provided = req.headers.get(RETRY_SECRET_HEADER) ?? "";
  if (!timingSafeCompare(provided, configuredSecret)) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Invalid or missing retry secret." } },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const result = await processDueWebhookRetries();
    return NextResponse.json({ data: result }, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[api/v1/webhooks/retry-due] sweep failed:", err);
    return NextResponse.json(
      { error: { code: "internal_error", message: "An unexpected error occurred." } },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
