import { describe, it, expect } from "vitest";
import {
  encodeCursor,
  decodeCursor,
  cursorWhere,
  cursorOrderBy,
  buildPage,
  parseLimit,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from "./pagination";
import { ApiError } from "./errors";

describe("encodeCursor / decodeCursor", () => {
  it("round-trips a cursor", () => {
    const cursor = { t: "2024-01-01T00:00:00.000Z", i: "abc123" };
    const decoded = decodeCursor(encodeCursor(cursor));
    expect(decoded).toEqual(cursor);
  });

  it("returns null for a missing cursor rather than throwing", () => {
    expect(decodeCursor(null)).toBeNull();
    expect(decodeCursor(undefined)).toBeNull();
    expect(decodeCursor("")).toBeNull();
  });

  it("throws a 400 ApiError, never silently starting over, on a tampered cursor", () => {
    expect(() => decodeCursor("not-valid-base64url-json")).toThrow(ApiError);
    try {
      decodeCursor("not-valid-base64url-json");
    } catch (e) {
      expect((e as ApiError).status).toBe(400);
    }
  });

  it("rejects a cursor decoding to the wrong shape", () => {
    const badShape = Buffer.from(JSON.stringify({ foo: "bar" }), "utf8").toString("base64url");
    expect(() => decodeCursor(badShape)).toThrow(ApiError);
  });

  it("rejects a cursor with an unparsable timestamp", () => {
    const badDate = Buffer.from(JSON.stringify({ t: "not-a-date", i: "x" }), "utf8").toString("base64url");
    expect(() => decodeCursor(badDate)).toThrow(ApiError);
  });

  it("rejects an oversized cursor outright", () => {
    expect(() => decodeCursor("a".repeat(600))).toThrow(ApiError);
  });
});

describe("cursorWhere", () => {
  it("returns an empty filter for no cursor", () => {
    expect(cursorWhere(null, "createdAt", "desc")).toEqual({});
  });

  it("builds a strict less-than boundary for descending order", () => {
    const where = cursorWhere({ t: "2024-01-01T00:00:00.000Z", i: "row-5" }, "createdAt", "desc");
    expect(where).toEqual({
      OR: [
        { createdAt: { lt: new Date("2024-01-01T00:00:00.000Z") } },
        { createdAt: new Date("2024-01-01T00:00:00.000Z"), id: { lt: "row-5" } },
      ],
    });
  });

  it("builds a strict greater-than boundary for ascending order", () => {
    const where = cursorWhere({ t: "2024-01-01T00:00:00.000Z", i: "row-5" }, "createdAt", "asc");
    expect(where).toEqual({
      OR: [
        { createdAt: { gt: new Date("2024-01-01T00:00:00.000Z") } },
        { createdAt: new Date("2024-01-01T00:00:00.000Z"), id: { gt: "row-5" } },
      ],
    });
  });
});

describe("cursorOrderBy", () => {
  it("orders by the sort field then id, both in the requested direction", () => {
    expect(cursorOrderBy("createdAt", "desc")).toEqual([{ createdAt: "desc" }, { id: "desc" }]);
  });
});

describe("buildPage", () => {
  const row = (id: string, createdAt: string) => ({ id, createdAt: new Date(createdAt) });

  it("returns no next cursor when fewer rows than the limit come back", () => {
    const rows = [row("1", "2024-01-01"), row("2", "2024-01-02")];
    const { items, nextCursor } = buildPage(rows, 5, (r) => r.createdAt);
    expect(items).toHaveLength(2);
    expect(nextCursor).toBeNull();
  });

  it("trims the sentinel over-fetched row and derives a cursor from the last kept row", () => {
    const rows = [row("1", "2024-01-01"), row("2", "2024-01-02"), row("3", "2024-01-03")];
    const { items, nextCursor } = buildPage(rows, 2, (r) => r.createdAt);
    expect(items).toHaveLength(2);
    expect(items.map((r) => r.id)).toEqual(["1", "2"]);
    expect(nextCursor).not.toBeNull();
    expect(decodeCursor(nextCursor)).toEqual({ t: new Date("2024-01-02").toISOString(), i: "2" });
  });
});

describe("parseLimit", () => {
  it("defaults when no limit is supplied", () => {
    expect(parseLimit(null)).toBe(DEFAULT_PAGE_SIZE);
    expect(parseLimit("")).toBe(DEFAULT_PAGE_SIZE);
  });

  it("accepts an in-range integer", () => {
    expect(parseLimit("10")).toBe(10);
    expect(parseLimit(String(MAX_PAGE_SIZE))).toBe(MAX_PAGE_SIZE);
    expect(parseLimit("1")).toBe(1);
  });

  it("rejects zero, negative, non-integer, and over-max values", () => {
    expect(() => parseLimit("0")).toThrow(ApiError);
    expect(() => parseLimit("-5")).toThrow(ApiError);
    expect(() => parseLimit("3.5")).toThrow(ApiError);
    expect(() => parseLimit(String(MAX_PAGE_SIZE + 1))).toThrow(ApiError);
    expect(() => parseLimit("not-a-number")).toThrow(ApiError);
  });
});
