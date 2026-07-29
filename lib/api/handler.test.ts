import { describe, it, expect } from "vitest";
import { z } from "zod";
import { readJsonBody, parseOrThrow, searchParamsToObject, MAX_BODY_BYTES } from "./handler";
import { ApiError } from "./errors";

function req(body: string, headers: Record<string, string> = {}): Request {
  return new Request("https://api.example.com/v1/issues", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body,
  });
}

describe("readJsonBody", () => {
  it("parses a valid JSON body", async () => {
    const parsed = await readJsonBody(req(JSON.stringify({ summary: "hi" })));
    expect(parsed).toEqual({ summary: "hi" });
  });

  it("rejects a non-JSON content type before reading the body — 415", async () => {
    const bad = new Request("https://api.example.com/v1/issues", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: "summary=hi",
    });
    await expect(readJsonBody(bad)).rejects.toMatchObject({ status: 415 });
  });

  it("rejects a missing content type", async () => {
    const bad = new Request("https://api.example.com/v1/issues", { method: "POST", body: "{}" });
    await expect(readJsonBody(bad)).rejects.toMatchObject({ status: 415 });
  });

  it("rejects malformed JSON with a 400, not a 500", async () => {
    await expect(readJsonBody(req("{not valid json"))).rejects.toMatchObject({ status: 400 });
  });

  it("rejects an empty body", async () => {
    await expect(readJsonBody(req("   "))).rejects.toMatchObject({ status: 400 });
  });

  it("rejects a body whose actual size exceeds MAX_BODY_BYTES even if Content-Length lies", async () => {
    const big = "a".repeat(MAX_BODY_BYTES + 10);
    const bad = req(JSON.stringify({ description: big }), { "content-length": "5" });
    await expect(readJsonBody(bad)).rejects.toMatchObject({ status: 413 });
  });

  it("rejects a declared Content-Length over the limit before reading the body", async () => {
    const bad = req("{}", { "content-length": String(MAX_BODY_BYTES + 1) });
    await expect(readJsonBody(bad)).rejects.toMatchObject({ status: 413 });
  });
});

describe("parseOrThrow", () => {
  const schema = z.object({ name: z.string().min(1) }).strict();

  it("returns the parsed data on success", () => {
    expect(parseOrThrow(schema, { name: "x" })).toEqual({ name: "x" });
  });

  it("throws a 400 ApiError with per-field details on failure", () => {
    try {
      parseOrThrow(schema, { name: "" });
      throw new Error("expected to throw");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).status).toBe(400);
      expect((e as ApiError).details?.[0]?.field).toBe("name");
    }
  });

  it("caps the number of reported field errors at 20", () => {
    const bigSchema = z
      .object(Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`f${i}`, z.string()])))
      .strict();
    try {
      parseOrThrow(bigSchema, {});
      throw new Error("expected to throw");
    } catch (e) {
      expect((e as ApiError).details?.length).toBeLessThanOrEqual(20);
    }
  });
});

describe("searchParamsToObject", () => {
  it("converts query params to a plain object", () => {
    expect(searchParamsToObject("https://api.example.com/v1/issues?status=DONE&type=BUG")).toEqual({
      status: "DONE",
      type: "BUG",
    });
  });

  it("excludes limit and cursor — reserved for the pagination layer", () => {
    const out = searchParamsToObject("https://api.example.com/v1/issues?status=DONE&limit=10&cursor=abc");
    expect(out).toEqual({ status: "DONE" });
  });

  it("keeps only the first value for a repeated param rather than treating it as an OR", () => {
    const out = searchParamsToObject("https://api.example.com/v1/issues?status=DONE&status=TO_DO");
    expect(out).toEqual({ status: "DONE" });
  });
});
