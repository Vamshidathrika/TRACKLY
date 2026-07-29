import { describe, it, expect } from "vitest";
import { API_SCOPES, isApiScope, sanitiseScopes, hasScope, SCOPE_PRESETS } from "./scopes";

describe("isApiScope", () => {
  it("accepts every known scope", () => {
    for (const scope of API_SCOPES) {
      expect(isApiScope(scope)).toBe(true);
    }
  });

  it("rejects unknown values", () => {
    expect(isApiScope("issues:delete")).toBe(false);
    expect(isApiScope("")).toBe(false);
    expect(isApiScope("issues:read ")).toBe(false); // no trimming at this layer
  });
});

describe("sanitiseScopes", () => {
  it("drops unrecognised scopes rather than persisting them", () => {
    const result = sanitiseScopes(["issues:read", "issues:delete", "made-up-scope"]);
    expect(result).toEqual(["issues:read"]);
  });

  it("de-duplicates and returns scopes in the canonical API_SCOPES order regardless of input order", () => {
    const result = sanitiseScopes(["worklogs:write", "issues:read", "issues:read", "projects:read"]);
    expect(result).toEqual(["projects:read", "issues:read", "worklogs:write"]);
  });

  it("trims whitespace before validating", () => {
    expect(sanitiseScopes([" issues:read "])).toEqual(["issues:read"]);
  });

  it("returns an empty array when nothing is valid", () => {
    expect(sanitiseScopes(["nonsense", ""])).toEqual([]);
  });

  it("never returns a scope that was not in the input, even if it exists in API_SCOPES", () => {
    const result = sanitiseScopes(["issues:read"]);
    expect(result).not.toContain("issues:write");
  });
});

describe("hasScope", () => {
  it("is true only when the scope is present in the granted list", () => {
    expect(hasScope(["issues:read", "issues:write"], "issues:read")).toBe(true);
    expect(hasScope(["issues:read"], "issues:write")).toBe(false);
    expect(hasScope([], "issues:read")).toBe(false);
  });
});

describe("SCOPE_PRESETS", () => {
  it("read-only preset never includes a :write scope", () => {
    const readOnly = SCOPE_PRESETS.find((p) => p.id === "read-only")!;
    expect(readOnly.scopes.every((s) => !s.endsWith(":write"))).toBe(true);
  });

  it("read-write preset covers every declared scope", () => {
    const readWrite = SCOPE_PRESETS.find((p) => p.id === "read-write")!;
    expect(new Set(readWrite.scopes)).toEqual(new Set(API_SCOPES));
  });
});
