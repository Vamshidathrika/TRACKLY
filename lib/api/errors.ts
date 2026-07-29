/**
 * Error taxonomy for the public API (`/api/v1`).
 *
 * The rule this module exists to enforce: **nothing internal ever reaches the
 * response body.** A Prisma error string names columns and constraints, a
 * thrown `Error` from `lib/*` carries our internal sentinel vocabulary
 * (`PROJECT_NOT_FOUND`, `PERMISSION_DENIED_ASSIGNEE_ONLY`), and a stack trace
 * names file paths. All three are useful to an attacker mapping the system and
 * useless to a legitimate integrator.
 *
 * So: an `ApiError` carries a message that was written for a client. Anything
 * else that escapes a handler is logged server-side with its request id and
 * answered with a flat `internal_error`.
 */

export type ApiErrorCode =
  | "invalid_request"
  | "invalid_token"
  | "unauthorized"
  | "forbidden"
  | "insufficient_scope"
  | "not_found"
  | "method_not_allowed"
  | "conflict"
  | "unsupported_media_type"
  | "payload_too_large"
  | "rate_limited"
  | "internal_error"
  | "service_unavailable";

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  invalid_request: 400,
  invalid_token: 401,
  unauthorized: 401,
  forbidden: 403,
  insufficient_scope: 403,
  not_found: 404,
  method_not_allowed: 405,
  conflict: 409,
  unsupported_media_type: 415,
  payload_too_large: 413,
  rate_limited: 429,
  internal_error: 500,
  service_unavailable: 503,
};

export type ApiErrorDetail = {
  /** Dotted path into the request body / query, e.g. `filter.status`. */
  field: string;
  message: string;
};

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details?: ApiErrorDetail[];
  /** Extra response headers (`WWW-Authenticate`, `Retry-After`, …). */
  readonly headers?: Record<string, string>;

  constructor(
    code: ApiErrorCode,
    message: string,
    options?: { details?: ApiErrorDetail[]; headers?: Record<string, string> }
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.details = options?.details;
    this.headers = options?.headers;
  }
}

export const apiError = {
  invalidRequest: (message: string, details?: ApiErrorDetail[]) =>
    new ApiError("invalid_request", message, { details }),

  /**
   * Deliberately identical for "no header", "malformed header", "unknown
   * token", "revoked token" and "expired token". Distinguishing them turns the
   * endpoint into an oracle that confirms which tokens once existed.
   */
  invalidToken: () =>
    new ApiError("invalid_token", "The API token is missing, malformed, or no longer valid.", {
      headers: { "WWW-Authenticate": 'Bearer realm="trackly", error="invalid_token"' },
    }),

  insufficientScope: (required: string) =>
    new ApiError("insufficient_scope", `This token is missing the required scope: ${required}.`, {
      headers: {
        "WWW-Authenticate": `Bearer realm="trackly", error="insufficient_scope", scope="${required}"`,
      },
    }),

  forbidden: (message = "This token is not permitted to perform that action.") =>
    new ApiError("forbidden", message),

  /**
   * Used for genuinely-absent resources AND for resources that exist in another
   * workspace. A 403 on the latter would confirm the id is real, which is a
   * cross-tenant existence oracle; 404 keeps the two indistinguishable.
   */
  notFound: (resource: string) => new ApiError("not_found", `${resource} was not found.`),

  conflict: (message: string) => new ApiError("conflict", message),

  rateLimited: (retryAfterSeconds: number) =>
    new ApiError("rate_limited", "Rate limit exceeded for this API token.", {
      headers: { "Retry-After": String(Math.max(1, Math.ceil(retryAfterSeconds))) },
    }),

  payloadTooLarge: (maxBytes: number) =>
    new ApiError("payload_too_large", `Request body exceeds the ${maxBytes} byte limit.`),

  unsupportedMediaType: () =>
    new ApiError("unsupported_media_type", "Content-Type must be application/json."),

  serviceUnavailable: (message: string) => new ApiError("service_unavailable", message),

  internal: () => new ApiError("internal_error", "An unexpected error occurred."),
};

/**
 * Sentinel messages thrown by `lib/*` business logic, mapped to safe public
 * errors. Anything not in this table is treated as unexpected — we do not pass
 * `e.message` through, because that is exactly how Prisma constraint text and
 * connection strings end up in a customer's log aggregator.
 */
const SENTINEL_MAP: Record<string, () => ApiError> = {
  PROJECT_NOT_FOUND: () => apiError.notFound("Project"),
  ISSUE_NOT_FOUND: () => apiError.notFound("Issue"),
  COMMENT_NOT_FOUND: () => apiError.notFound("Comment"),
  KEY_TAKEN: () => apiError.conflict("That project key is already in use."),
  PERMISSION_DENIED_ASSIGNEE_ONLY: () =>
    apiError.forbidden("Only the assignee or a workspace admin may change this issue's status."),
  PERMISSION_DENIED_COMMENT_AUTHOR_ONLY: () =>
    apiError.forbidden("Only the comment author may modify this comment."),
  ONLY_OWNER_OR_ADMIN_CAN_DELETE: () =>
    apiError.forbidden("Only a project admin may delete this project."),
};

/**
 * Normalises anything thrown inside a handler into an `ApiError`.
 * Returns the error to serialise plus whether the caller should log it.
 */
export function normaliseError(e: unknown): { error: ApiError; shouldLog: boolean } {
  if (e instanceof ApiError) {
    return { error: e, shouldLog: e.status >= 500 };
  }

  if (e instanceof Error) {
    const mapped = SENTINEL_MAP[e.message];
    if (mapped) return { error: mapped(), shouldLog: false };

    // Prisma unique-constraint violations are the one driver error worth
    // translating: they are a client problem (409), not a server fault.
    const code = (e as { code?: string }).code;
    if (code === "P2002") {
      return { error: apiError.conflict("That resource already exists."), shouldLog: false };
    }
    if (code === "P2025") {
      return { error: apiError.notFound("Resource"), shouldLog: false };
    }
  }

  return { error: apiError.internal(), shouldLog: true };
}
