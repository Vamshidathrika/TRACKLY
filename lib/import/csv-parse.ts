/**
 * RFC 4180 CSV tokeniser.
 *
 * Positional on purpose. Jira's CSV export repeats column headers — an issue
 * with three comments produces three columns literally named `Comment` — so
 * any parser that keys rows by header name silently keeps only the last one.
 * This returns `string[][]` and lets lib/import/jira/csv.ts decide how to
 * gather repeated columns.
 *
 * See .plan/import-deps.md for why this is 70 lines instead of a dependency.
 */

const QUOTE = '"';

export type CsvParseResult = {
  header: string[];
  rows: string[][];
};

/** Split CSV text into raw cells. Handles quoted delimiters, escaped quotes (""), embedded newlines, and CRLF. */
export function parseCsv(text: string, delimiter = ","): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let fieldWasQuoted = false;

  // Strip a UTF-8 BOM: Jira's export has one, and it would otherwise become
  // part of the first header name and break every column lookup.
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  const pushField = () => {
    row.push(fieldWasQuoted ? field : field.trim());
    field = "";
    fieldWasQuoted = false;
  };

  const pushRow = () => {
    pushField();
    // Skip rows that are entirely empty — trailing newlines are not records.
    if (row.length > 1 || row[0] !== "") rows.push(row);
    row = [];
  };

  for (let i = 0; i < src.length; i++) {
    const char = src[i];

    if (inQuotes) {
      if (char === QUOTE) {
        if (src[i + 1] === QUOTE) {
          field += QUOTE;
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === QUOTE && field.trim() === "") {
      inQuotes = true;
      fieldWasQuoted = true;
      field = "";
      continue;
    }
    if (char === delimiter) {
      pushField();
      continue;
    }
    if (char === "\r") {
      if (src[i + 1] === "\n") i++;
      pushRow();
      continue;
    }
    if (char === "\n") {
      pushRow();
      continue;
    }
    field += char;
  }

  // A file that does not end in a newline still has a final record.
  if (field !== "" || row.length > 0) pushRow();

  return rows;
}

/** Parse and split off the header row. Throws only when there is no header at all. */
export function parseCsvWithHeader(text: string, delimiter = ","): CsvParseResult {
  const rows = parseCsv(text, delimiter);
  if (rows.length === 0) throw new Error("CSV file is empty");
  const [header, ...body] = rows;
  return { header: header.map((h) => h.trim()), rows: body };
}

/**
 * Index of every column whose header matches `name`, case-insensitively.
 * Jira suffixes nothing — duplicates are literal duplicates — so a caller
 * asking for "Comment" gets every comment column in file order.
 */
export function columnIndexes(header: string[], name: string): number[] {
  const target = name.trim().toLowerCase();
  const hits: number[] = [];
  for (let i = 0; i < header.length; i++) {
    if (header[i].trim().toLowerCase() === target) hits.push(i);
  }
  return hits;
}

/** First non-empty value across every column with this header. */
export function cell(header: string[], row: string[], name: string): string | null {
  for (const i of columnIndexes(header, name)) {
    const value = row[i]?.trim();
    if (value) return value;
  }
  return null;
}

/** Every non-empty value across every column with this header, deduplicated. */
export function cells(header: string[], row: string[], name: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const i of columnIndexes(header, name)) {
    const value = row[i]?.trim();
    if (value && !seen.has(value)) {
      seen.add(value);
      out.push(value);
    }
  }
  return out;
}
