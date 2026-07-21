import { describe, it, expect } from "vitest";
import { makeSlug } from "./slug";

describe("makeSlug", () => {
  it("lowercases, hyphenates, strips symbols, adds 6-char suffix", () => {
    const slug = makeSlug("USK Corp!! Site");
    expect(slug).toMatch(/^usk-corp-site-[a-z0-9]{6}$/);
  });
  it("is unique across calls", () => {
    expect(makeSlug("Team")).not.toBe(makeSlug("Team"));
  });
});
