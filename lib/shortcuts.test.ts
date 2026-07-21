import { describe, it, expect } from "vitest";
import { matchShortcut, isEditableTarget } from "./shortcuts";

const ev = (key: string, mod = false) => ({
  key,
  metaKey: mod,
  ctrlKey: false,
  target: null,
});

describe("matchShortcut", () => {
  it("matches single key", () => {
    expect(matchShortcut(ev("c"), "c", null)).toEqual({ match: true, pending: null });
  });

  it("matches mod+k chord", () => {
    expect(matchShortcut(ev("k", true), "mod+k", null)).toEqual({ match: true, pending: null });
    expect(matchShortcut(ev("k"), "mod+k", null).match).toBe(false);
  });

  it("handles two-key sequence via pending state", () => {
    const first = matchShortcut(ev("g"), "g d", null);
    expect(first).toEqual({ match: false, pending: "g" });
    expect(matchShortcut(ev("d"), "g d", "g")).toEqual({ match: true, pending: null });
    expect(matchShortcut(ev("x"), "g d", "g")).toEqual({ match: false, pending: null });
  });
});

describe("isEditableTarget", () => {
  it("true for input elements", () => {
    const input = document.createElement("input");
    expect(isEditableTarget(input)).toBe(true);
  });

  it("false for body", () => {
    expect(isEditableTarget(document.body)).toBe(false);
  });
});
