import { describe, it, expect } from "vitest";
import { toDate, secondsToHours } from "./dates";

describe("toDate", () => {
  it("parses Jira's ISO-ish REST timestamp with a colonless offset", () => {
    const d = toDate("2024-03-11T09:12:44.000+0000");
    expect(d).not.toBeNull();
    expect(d!.getUTCFullYear()).toBe(2024);
    expect(d!.getUTCMonth()).toBe(2);
    expect(d!.getUTCDate()).toBe(11);
  });

  it("parses Jira's CSV display format with AM/PM", () => {
    const d = toDate("11/Mar/24 9:12 AM");
    expect(d).not.toBeNull();
    expect(d!.getUTCFullYear()).toBe(2024);
    expect(d!.getUTCMonth()).toBe(2);
    expect(d!.getUTCDate()).toBe(11);
    expect(d!.getUTCHours()).toBe(9);
    expect(d!.getUTCMinutes()).toBe(12);
  });

  it("handles 12 AM / 12 PM boundary correctly", () => {
    expect(toDate("01/Jan/24 12:00 AM")!.getUTCHours()).toBe(0);
    expect(toDate("01/Jan/24 12:00 PM")!.getUTCHours()).toBe(12);
  });

  it("parses a CSV date with no time component", () => {
    const d = toDate("01/Jan/24");
    expect(d).not.toBeNull();
    expect(d!.getUTCHours()).toBe(0);
  });

  it("rolls two-digit years using the century pivot", () => {
    expect(toDate("01/Jan/69")!.getUTCFullYear()).toBe(2069);
    expect(toDate("01/Jan/70")!.getUTCFullYear()).toBe(1970);
  });

  it("passes through a Date instance", () => {
    const input = new Date("2024-01-01T00:00:00Z");
    expect(toDate(input)).toBe(input);
  });

  it("parses an epoch number", () => {
    expect(toDate(0)!.getTime()).toBe(0);
  });

  it("returns null for garbage input", () => {
    expect(toDate("not a date")).toBeNull();
    expect(toDate("")).toBeNull();
    expect(toDate(null)).toBeNull();
    expect(toDate(undefined)).toBeNull();
    expect(toDate({})).toBeNull();
    expect(toDate(new Date("invalid"))).toBeNull();
  });
});

describe("secondsToHours", () => {
  it("converts seconds to hours, rounded to 2dp", () => {
    expect(secondsToHours(3600)).toBe(1);
    expect(secondsToHours(5400)).toBe(1.5);
    expect(secondsToHours(100)).toBe(0.03);
  });

  it("returns null for missing, zero, or negative input", () => {
    expect(secondsToHours(null)).toBeNull();
    expect(secondsToHours(undefined)).toBeNull();
    expect(secondsToHours(0)).toBeNull();
    expect(secondsToHours(-10)).toBeNull();
  });

  it("returns null for non-finite input", () => {
    expect(secondsToHours(Infinity)).toBeNull();
    expect(secondsToHours(NaN)).toBeNull();
  });
});
