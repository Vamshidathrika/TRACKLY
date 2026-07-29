import { describe, it, expect } from "vitest";
import { apiError, ApiError, normaliseError } from "./errors";

describe("apiError factories", () => {
  it("map to the documented HTTP status codes", () => {
    expect(apiError.invalidRequest("x").status).toBe(400);
    expect(apiError.invalidToken().status).toBe(401);
    expect(apiError.forbidden().status).toBe(403);
    expect(apiError.insufficientScope("issues:write").status).toBe(403);
    expect(apiError.notFound("Issue").status).toBe(404);
    expect(apiError.conflict("x").status).toBe(409);
    expect(apiError.payloadTooLarge(100).status).toBe(413);
    expect(apiError.unsupportedMediaType().status).toBe(415);
    expect(apiError.rateLimited(30).status).toBe(429);
    expect(apiError.internal().status).toBe(500);
    expect(apiError.serviceUnavailable("x").status).toBe(503);
  });

  it("invalidToken carries a WWW-Authenticate header and a code that cannot be told apart from a revoked/expired token", () => {
    const err = apiError.invalidToken();
    expect(err.code).toBe("invalid_token");
    expect(err.headers?.["WWW-Authenticate"]).toContain("invalid_token");
  });

  it("rateLimited clamps Retry-After to at least 1 second", () => {
    expect(apiError.rateLimited(0.2).headers?.["Retry-After"]).toBe("1");
    expect(apiError.rateLimited(45).headers?.["Retry-After"]).toBe("45");
  });
});

describe("normaliseError", () => {
  it("passes an ApiError through unchanged and only logs 5xx", () => {
    const clientErr = apiError.notFound("Issue");
    const { error, shouldLog } = normaliseError(clientErr);
    expect(error).toBe(clientErr);
    expect(shouldLog).toBe(false);

    const serverErr = apiError.internal();
    expect(normaliseError(serverErr).shouldLog).toBe(true);
  });

  it("maps a known sentinel Error message to its safe public error, without leaking the sentinel text", () => {
    const { error, shouldLog } = normaliseError(new Error("PROJECT_NOT_FOUND"));
    expect(error.code).toBe("not_found");
    expect(error.message).not.toContain("PROJECT_NOT_FOUND");
    expect(shouldLog).toBe(false);
  });

  it("maps a Prisma P2002 unique-constraint violation to 409 without echoing driver text", () => {
    const prismaErr = Object.assign(new Error("Unique constraint failed on the fields: (`tokenHash`)"), {
      code: "P2002",
    });
    const { error } = normaliseError(prismaErr);
    expect(error.status).toBe(409);
    expect(error.message).not.toContain("tokenHash");
  });

  it("maps a Prisma P2025 not-found error to 404", () => {
    const prismaErr = Object.assign(new Error("Record to update not found."), { code: "P2025" });
    expect(normaliseError(prismaErr).error.status).toBe(404);
  });

  it("treats an unrecognised Error as an opaque internal_error and logs it, never echoing its message", () => {
    const { error, shouldLog } = normaliseError(new Error("connection refused at 10.0.4.2:5432"));
    expect(error.code).toBe("internal_error");
    expect(error.message).not.toContain("10.0.4.2");
    expect(shouldLog).toBe(true);
  });

  it("treats a non-Error throw the same way", () => {
    const { error, shouldLog } = normaliseError("a raw string throw");
    expect(error.code).toBe("internal_error");
    expect(shouldLog).toBe(true);
  });
});

describe("ApiError", () => {
  it("carries field-level details through to the instance", () => {
    const err = new ApiError("invalid_request", "bad body", {
      details: [{ field: "summary", message: "required" }],
    });
    expect(err.details).toEqual([{ field: "summary", message: "required" }]);
  });
});
