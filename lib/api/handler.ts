/**
 * The wrapper every `/api/v1` route handler goes through.
 *
 * Centralising this is a security control, not a tidiness preference: an
 * endpoint that forgets to authenticate, forgets to rate limit, or lets a raw
 * exception reach the response body is a per-file mistake waiting to happen.
 * Here it is impossible to add a route without all three, because the route
 * exports the wrapper's return value rather than a bare handler.
 *
 * Order matters and is fixed:
 *   1. authenticate  — no principal, no work.
 *   2. rate limit    — bucketed per key, so one noisy token cannot spend
 *                      another tenant's budget.
 *   3. handler       — receives an immutable `ApiContext`.
 *   4. normalise     — every throw becomes a safe envelope; 5xx are logged with
 *                      the request id and never echoed.
 */
import { NextResponse } from "next/server";
import type { ApiContext } from "./auth";
import { authenticateRequest } from "./auth";
import { apiError, normaliseError } from "./errors";
import { jsonError, newRequestId } from "./response";
import { consumeRateLimit, rateLimitHeaders, rateLimitKeys } from "./rate-limit";

export type ApiHandler<P> = (args: {
  req: Request;
  ctx: ApiContext;
  params: P;
}) => Promise<NextResponse>;

/** 256 KiB. Comfortably above a large issue description, far below a memory problem. */
export const MAX_BODY_BYTES = 256 * 1024;

export function withApi<P = Record<string, never>>(handler: ApiHandler<P>) {
  return async (req: Request, routeArgs: { params: Promise<P> }): Promise<NextResponse> => {
    const requestId = newRequestId();
    let rateHeaders: Record<string, string> = {};

    try {
      const ctx = await authenticateRequest(req.headers, requestId);

      const limit = await consumeRateLimit(rateLimitKeys.token(ctx.keyId), ctx.rateLimitPerMinute);
      rateHeaders = rateLimitHeaders(limit);
      if (!limit.allowed) {
        throw apiError.rateLimited(limit.retryAfterSeconds);
      }

      const params = ((await routeArgs?.params) ?? {}) as P;
      const response = await handler({ req, ctx, params });

      for (const [name, value] of Object.entries(rateHeaders)) {
        response.headers.set(name, value);
      }
      return response;
    } catch (e) {
      const { error, shouldLog } = normaliseError(e);
      if (shouldLog) {
        // The only place the underlying failure is ever recorded. It does not
        // travel to the client; the request id is the bridge between the two.
        console.error(`[api/v1] requestId=${requestId} unhandled error:`, e);
      }
      return jsonError(error, { requestId, headers: rateHeaders });
    }
  };
}

/**
 * Reads and parses a JSON request body.
 *
 * Rejects a wrong content type (415) before reading anything — otherwise a
 * form-encoded POST from a browser form is a CSRF vector against any endpoint
 * that would otherwise happily coerce it. Bearer-only auth already blocks that,
 * but requiring `application/json` is the second lock on the same door.
 */
export async function readJsonBody(req: Request): Promise<unknown> {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().split(";")[0].trim().endsWith("application/json")) {
    throw apiError.unsupportedMediaType();
  }

  const declaredLength = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    throw apiError.payloadTooLarge(MAX_BODY_BYTES);
  }

  const raw = await req.text();
  if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) {
    throw apiError.payloadTooLarge(MAX_BODY_BYTES);
  }
  if (raw.trim() === "") {
    throw apiError.invalidRequest("A JSON request body is required.");
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw apiError.invalidRequest("Request body is not valid JSON.");
  }
}

type ZodLike<T> = {
  safeParse(input: unknown):
    | { success: true; data: T }
    | { success: false; error: { issues: { path: PropertyKey[]; message: string }[] } };
};

/**
 * Runs a zod schema and converts a failure into a 400 with per-field details.
 * Zod's own message text is safe to expose — it describes the caller's input,
 * not our internals.
 */
export function parseOrThrow<T>(schema: ZodLike<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (result.success) return result.data;

  const details = result.error.issues.slice(0, 20).map((issue) => ({
    field: issue.path.map(String).join(".") || "(body)",
    message: issue.message,
  }));

  throw apiError.invalidRequest("Request validation failed.", details);
}

/** `URLSearchParams` → plain object, so a zod object schema can validate it. */
export function searchParamsToObject(url: string): Record<string, string> {
  const params = new URL(url).searchParams;
  const out: Record<string, string> = {};
  for (const [key, value] of params) {
    // Reserved by the pagination layer and validated separately.
    if (key === "limit" || key === "cursor") continue;
    // First value wins; `?status=DONE&status=TO_DO` is ambiguous, not an OR.
    if (!(key in out)) out[key] = value;
  }
  return out;
}
