import { describe, it, expect } from "vitest";
import { parseCsv, parseCsvWithHeader, columnIndexes, cell, cells } from "./csv-parse";

describe("parseCsv", () => {
  it("splits simple comma-separated rows", () => {
    expect(parseCsv("a,b,c\n1,2,3")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("handles quoted fields containing commas", () => {
    expect(parseCsv('a,"b, with comma",c')).toEqual([["a", "b, with comma", "c"]]);
  });

  it("handles escaped double quotes inside a quoted field", () => {
    expect(parseCsv('a,"she said ""hi""",c')).toEqual([["a", 'she said "hi"', "c"]]);
  });

  it("handles embedded newlines inside quoted fields", () => {
    expect(parseCsv('a,"line1\nline2",c')).toEqual([["a", "line1\nline2", "c"]]);
  });

  it("handles CRLF line endings", () => {
    expect(parseCsv("a,b\r\n1,2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("strips a UTF-8 BOM from the start of the file", () => {
    const withBom = "﻿a,b\n1,2";
    expect(parseCsv(withBom)[0]).toEqual(["a", "b"]);
  });

  it("trims unquoted fields but preserves whitespace inside quoted ones", () => {
    expect(parseCsv(' a ," b "')).toEqual([["a", " b "]]);
  });

  it("skips trailing blank lines", () => {
    expect(parseCsv("a,b\n1,2\n\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("keeps a final record even without a trailing newline", () => {
    expect(parseCsv("a,b\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("parseCsvWithHeader", () => {
  it("splits the header from the body", () => {
    const { header, rows } = parseCsvWithHeader("Key,Summary\nACME-1,First\nACME-2,Second");
    expect(header).toEqual(["Key", "Summary"]);
    expect(rows).toEqual([
      ["ACME-1", "First"],
      ["ACME-2", "Second"],
    ]);
  });

  it("throws on an empty file", () => {
    expect(() => parseCsvWithHeader("")).toThrow(/empty/i);
  });
});

describe("duplicate-header helpers", () => {
  const header = ["Key", "Comment", "Comment", "Comment"];
  const row = ["ACME-1", "first comment", "", "third comment"];

  it("columnIndexes finds every matching column, case-insensitively", () => {
    expect(columnIndexes(header, "comment")).toEqual([1, 2, 3]);
    expect(columnIndexes(header, "Key")).toEqual([0]);
  });

  it("cell returns the first non-empty value across duplicate columns", () => {
    expect(cell(header, row, "Comment")).toBe("first comment");
  });

  it("cells returns every non-empty, deduplicated value", () => {
    expect(cells(header, row, "Comment")).toEqual(["first comment", "third comment"]);
  });

  it("cell returns null when no column matches or all are empty", () => {
    expect(cell(header, row, "Missing")).toBeNull();
    expect(cell(["Key", "Comment"], ["ACME-1", ""], "Comment")).toBeNull();
  });
});
