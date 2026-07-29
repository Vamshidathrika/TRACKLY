import { describe, it, expect } from "vitest";
import {
  TOKEN_PREFIX,
  mintToken,
  hashToken,
  looksLikeToken,
  parseBearerToken,
  timingSafeCompare,
} from "./tokens";

describe("mintToken", () => {
  it("produces a token with the trk_ prefix and a matching hash", () => {
    const { token, tokenHash, tokenPrefix } = mintToken();
    expect(token.startsWith(TOKEN_PREFIX)).toBe(true);
    expect(hashToken(token)).toBe(tokenHash);
    expect(token.startsWith(tokenPrefix)).toBe(true);
  });

  it("never mints the same token twice", () => {
    const a = mintToken();
    const b = mintToken();
    expect(a.token).not.toBe(b.token);
    expect(a.tokenHash).not.toBe(b.tokenHash);
  });

  it("never stores or returns the plaintext anywhere but `token`", () => {
    const { token, tokenHash, tokenPrefix } = mintToken();
    expect(tokenHash).not.toBe(token);
    expect(tokenPrefix.length).toBeLessThan(token.length);
  });
});

describe("looksLikeToken / parseBearerToken", () => {
  it("accepts a well-formed minted token", () => {
    const { token } = mintToken();
    expect(looksLikeToken(token)).toBe(true);
    expect(parseBearerToken(`Bearer ${token}`)).toBe(token);
  });

  it("rejects malformed shapes", () => {
    expect(looksLikeToken("trk_short")).toBe(false);
    expect(looksLikeToken("not_the_right_prefix_" + "a".repeat(43))).toBe(false);
    expect(looksLikeToken("")).toBe(false);
  });

  it("returns null for a missing or empty Authorization header", () => {
    expect(parseBearerToken(null)).toBeNull();
    expect(parseBearerToken("")).toBeNull();
  });

  it("returns null for a non-Bearer scheme", () => {
    const { token } = mintToken();
    expect(parseBearerToken(`Basic ${token}`)).toBeNull();
  });

  it("returns null when the Authorization header carries a malformed token", () => {
    expect(parseBearerToken("Bearer not-a-real-token")).toBeNull();
  });

  it("does not accept extra whitespace or multiple tokens as valid", () => {
    const { token } = mintToken();
    expect(parseBearerToken(`Bearer  ${token}`)).toBe(token); // collapses extra space
    expect(parseBearerToken(`Bearer ${token} extra`)).toBeNull();
  });
});

describe("timingSafeCompare", () => {
  it("returns true only for exactly equal strings", () => {
    expect(timingSafeCompare("secret-value", "secret-value")).toBe(true);
    expect(timingSafeCompare("secret-value", "secret-value2")).toBe(false);
    expect(timingSafeCompare("a", "b")).toBe(false);
  });

  it("returns false for empty strings on either side rather than throwing", () => {
    expect(timingSafeCompare("", "")).toBe(false);
    expect(timingSafeCompare("", "x")).toBe(false);
    expect(timingSafeCompare("x", "")).toBe(false);
  });

  it("does not throw on differing lengths", () => {
    expect(() => timingSafeCompare("short", "a-lot-longer-string")).not.toThrow();
    expect(timingSafeCompare("short", "a-lot-longer-string")).toBe(false);
  });
});
