/**
 * The single response envelope for `/api/v1`.
 *
 * Every response — success, failure, list — has the same top-level shape, so a
 * generated client can branch on `"error" in body` and nothing else:
 *
 *   { "data": …, "meta": { "requestId": … } }
 *   { "data": [ … ], "meta": { "requestId": …, "nextCursor": …, "hasMore": … } }
 *   { "error": { "code": …, "message": …, "details": [ … ] }, "meta": { "requestId": … } }
 *
 * `requestId` is echoed in the `X-Request-Id` header too, so a support ticket
 * quoting it can be matched to the server log line without the body ever having
 * carried the underlying error.
 */
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import type { ApiError } from "./errors";

export type ApiMeta = {
  requestId: string;
  nextCursor?: string | null;
  hasMore?: boolean;
  limit?: number;
};

export function newRequestId(): string {
  return randomUUID();
}

/** Headers applied to every `/api/v1` response. */
function baseHeaders(requestId: string, extra?: Record<string, string>): Record<string, string> {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    // API responses are JSON-only and must never be rendered as a document.
    "X-Content-Type-Options": "nosniff",
    "X-Request-Id": requestId,
    ...extra,
  };
}

export function jsonOk<T>(
  data: T,
  opts: { requestId: string; status?: number; headers?: Record<string, string> }
): NextResponse {
  return NextResponse.json(
    { data, meta: { requestId: opts.requestId } },
    { status: opts.status ?? 200, headers: baseHeaders(opts.requestId, opts.headers) }
  );
}

export function jsonList<T>(
  items: T[],
  opts: {
    requestId: string;
    limit: number;
    nextCursor: string | null;
    headers?: Record<string, string>;
  }
): NextResponse {
  return NextResponse.json(
    {
      data: items,
      meta: {
        requestId: opts.requestId,
        limit: opts.limit,
        nextCursor: opts.nextCursor,
        hasMore: opts.nextCursor !== null,
      },
    },
    { status: 200, headers: baseHeaders(opts.requestId, opts.headers) }
  );
}

export function jsonError(
  error: ApiError,
  opts: { requestId: string; headers?: Record<string, string> }
): NextResponse {
  return NextResponse.json(
    {
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
      meta: { requestId: opts.requestId },
    },
    {
      status: error.status,
      headers: baseHeaders(opts.requestId, { ...error.headers, ...opts.headers }),
    }
  );
}
