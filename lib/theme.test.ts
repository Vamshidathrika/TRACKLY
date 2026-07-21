import { describe, it, expect } from "vitest";
import { parseThemeCookie, resolveTheme } from "./theme";

describe("parseThemeCookie", () => {
  it("returns valid prefs as-is", () => {
    expect(parseThemeCookie("dark")).toBe("dark");
    expect(parseThemeCookie("light")).toBe("light");
    expect(parseThemeCookie("system")).toBe("system");
  });
  it("defaults to system for undefined/garbage", () => {
    expect(parseThemeCookie(undefined)).toBe("system");
    expect(parseThemeCookie("banana")).toBe("system");
  });
});

describe("resolveTheme", () => {
  it("passes through explicit prefs", () => {
    expect(resolveTheme("dark", false)).toBe("dark");
    expect(resolveTheme("light", true)).toBe("light");
  });
  it("system follows OS", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });
});
