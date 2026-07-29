/**
 * Entry point for turning an uploaded file into NormalizedIssue[].
 *
 * Sniffs JSON vs CSV rather than trusting the file extension — people rename
 * exports, and a mislabelled file should produce a clear message instead of a
 * parser crash.
 */
import { parseJiraJson } from "./jira/json";
import { parseJiraCsv } from "./jira/csv";
import type { ImportSource, NormalizedIssue, RowIssue } from "./types";

export type ParseResult = {
  source: ImportSource;
  issues: NormalizedIssue[];
  rowIssues: RowIssue[];
  sourceRowCount: number;
};

/** Refuse absurd uploads before spending memory on JSON.parse. */
export const MAX_IMPORT_BYTES = 25 * 1024 * 1024;
export const MAX_IMPORT_ISSUES = 5000;

export function detectSource(text: string): ImportSource {
  const head = text.slice(0, 4096).replace(/^﻿/, "").trimStart();
  return head.startsWith("{") || head.startsWith("[") ? "JIRA_JSON" : "JIRA_CSV";
}

/**
 * Throws (rather than returning an error row) only when the whole file is
 * unusable — bad JSON syntax, a CSV with no key column. Per-row problems come
 * back in `rowIssues` so one broken row never costs you the other 4,999.
 */
export function parseImportFile(text: string, hint?: ImportSource): ParseResult {
  if (!text.trim()) throw new Error("The uploaded file is empty.");
  if (text.length > MAX_IMPORT_BYTES) {
    throw new Error(
      `File is larger than the ${Math.round(MAX_IMPORT_BYTES / 1024 / 1024)} MB import limit. Split the Jira export into smaller batches.`
    );
  }

  const source = hint ?? detectSource(text);

  if (source === "JIRA_JSON") {
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch (e) {
      throw new Error(`File is not valid JSON: ${e instanceof Error ? e.message : "parse error"}`);
    }
    const result = parseJiraJson(raw);
    return { source, ...capped(result) };
  }

  const result = parseJiraCsv(text);
  return { source, ...capped(result) };
}

function capped(result: {
  issues: NormalizedIssue[];
  rowIssues: RowIssue[];
  sourceRowCount: number;
}): { issues: NormalizedIssue[]; rowIssues: RowIssue[]; sourceRowCount: number } {
  if (result.issues.length <= MAX_IMPORT_ISSUES) return result;

  const kept = result.issues.slice(0, MAX_IMPORT_ISSUES);
  const dropped = result.issues.slice(MAX_IMPORT_ISSUES);

  // Every dropped row gets its own error line. A single "and 812 more were
  // ignored" would be exactly the silent truncation this importer must not do.
  const rowIssues: RowIssue[] = [
    ...result.rowIssues,
    ...dropped.map((issue) => ({
      row: issue.sourceRow,
      jiraKey: issue.jiraKey,
      field: null,
      severity: "error" as const,
      message: `Skipped: exceeds the ${MAX_IMPORT_ISSUES}-issue limit for a single import. Re-export in batches (e.g. by created date) and run the import again — re-runs are idempotent.`,
    })),
  ];

  return { issues: kept, rowIssues, sourceRowCount: result.sourceRowCount };
}
