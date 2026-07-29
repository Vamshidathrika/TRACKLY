import { describe, it, expect } from "vitest";
import { parseImportFile, detectSource, MAX_IMPORT_BYTES, MAX_IMPORT_ISSUES } from "./parse";

describe("detectSource", () => {
  it("detects JSON from a leading brace or bracket", () => {
    expect(detectSource('{"issues":[]}')).toBe("JIRA_JSON");
    expect(detectSource("[1,2,3]")).toBe("JIRA_JSON");
  });

  it("ignores a leading BOM when sniffing", () => {
    expect(detectSource('﻿{"issues":[]}')).toBe("JIRA_JSON");
  });

  it("falls back to CSV for everything else", () => {
    expect(detectSource("Issue key,Summary\nACME-1,Hi")).toBe("JIRA_CSV");
  });
});

describe("parseImportFile", () => {
  it("throws for an empty file", () => {
    expect(() => parseImportFile("   ")).toThrow(/empty/i);
  });

  it("throws for oversized files without reading them", () => {
    const huge = "a".repeat(MAX_IMPORT_BYTES + 1);
    expect(() => parseImportFile(huge)).toThrow(/import limit/i);
  });

  it("throws a readable error for invalid JSON", () => {
    expect(() => parseImportFile("{not valid json")).toThrow(/not valid JSON/);
  });

  it("routes to the JSON parser and tags the result", () => {
    const result = parseImportFile(JSON.stringify({ issues: [{ key: "ACME-1", fields: { summary: "Hi" } }] }));
    expect(result.source).toBe("JIRA_JSON");
    expect(result.issues).toHaveLength(1);
  });

  it("routes to the CSV parser and tags the result", () => {
    const result = parseImportFile("Issue key,Summary\nACME-1,Hi");
    expect(result.source).toBe("JIRA_CSV");
    expect(result.issues).toHaveLength(1);
  });

  it("respects an explicit source hint over sniffing", () => {
    // A CSV body sniffed as CSV, but forced through the JSON parser should fail
    // loudly rather than silently mis-parsing.
    expect(() => parseImportFile("Issue key,Summary\nACME-1,Hi", "JIRA_JSON")).toThrow(/not valid JSON/);
  });

  it("caps issues at MAX_IMPORT_ISSUES and reports every dropped row individually", () => {
    const issues = Array.from({ length: MAX_IMPORT_ISSUES + 5 }, (_, i) => ({
      key: `ACME-${i + 1}`,
      fields: { summary: "x" },
    }));
    const result = parseImportFile(JSON.stringify({ issues }));
    expect(result.issues).toHaveLength(MAX_IMPORT_ISSUES);
    expect(result.rowIssues).toHaveLength(5);
    expect(result.rowIssues.every((r) => r.severity === "error")).toBe(true);
    expect(result.sourceRowCount).toBe(MAX_IMPORT_ISSUES + 5);
  });
});
