/**
 * Opaque keyset ("cursor") pagination.
 *
 * Offset pagination is wrong for an issue tracker: rows are created and
 * reordered constantly, so `skip: 200` silently skips or repeats issues between
 * pages. A keyset cursor pins the page to the last row actually returned.
 *
 * The cursor encodes `(sortValue, id)` — the id breaks ties so two rows created
 * in the same millisecond cannot cause an infinite loop or a dropped row.
 *
 * It is base64url of JSON, and it is NOT signed. A tampered cursor can only
 * move the caller to a different page of a result set that is already filtered
 * to their workspace and their accessible projects by the caller — the scope
 * filter is applied *in addition to* the cursor predicate on every query, never
 * derived from it. Decode failures are a 400, never a silent "start from the
 * beginning", so a corrupted cursor cannot quietly re-serve page one forever.
 */
import { apiError } from "./errors";

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;

export type Cursor = {
  /** ISO-8601 timestamp of the sort column on the last row of the previous page. */
  t: string;
  /** Id of that row. */
  i: string;
};

export function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeCursor(raw: string | null | undefined): Cursor | null {
  if (!raw) return null;
  if (raw.length > 512) throw apiError.invalidRequest("The cursor parameter is not valid.");

  try {
    const parsed: unknown = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof (parsed as Cursor).t === "string" &&
      typeof (parsed as Cursor).i === "string" &&
      !Number.isNaN(Date.parse((parsed as Cursor).t))
    ) {
      return { t: (parsed as Cursor).t, i: (parsed as Cursor).i };
    }
  } catch {
    // fall through to the shared error below
  }

  throw apiError.invalidRequest("The cursor parameter is not valid.");
}

export type SortDirection = "asc" | "desc";

/**
 * Prisma `where` fragment implementing `(sortField, id) < (cursor.t, cursor.i)`
 * for descending order (and `>` for ascending).
 */
export function cursorWhere(
  cursor: Cursor | null,
  sortField: string,
  direction: SortDirection
): Record<string, unknown> {
  if (!cursor) return {};
  const op = direction === "desc" ? "lt" : "gt";
  const boundary = new Date(cursor.t);

  return {
    OR: [
      { [sortField]: { [op]: boundary } },
      { [sortField]: boundary, id: { [op]: cursor.i } },
    ],
  };
}

export function cursorOrderBy(
  sortField: string,
  direction: SortDirection
): Record<string, SortDirection>[] {
  return [{ [sortField]: direction }, { id: direction }];
}

/**
 * Trims the over-fetched sentinel row and derives the next cursor.
 * Callers must query `limit + 1` rows for `hasMore` to be accurate.
 */
export function buildPage<T extends { id: string }>(
  rows: T[],
  limit: number,
  sortValue: (row: T) => Date
): { items: T[]; nextCursor: string | null } {
  if (rows.length <= limit) return { items: rows, nextCursor: null };

  const items = rows.slice(0, limit);
  const last = items[items.length - 1];
  return {
    items,
    nextCursor: encodeCursor({ t: sortValue(last).toISOString(), i: last.id }),
  };
}

export function parseLimit(raw: string | null): number {
  if (raw === null || raw === "") return DEFAULT_PAGE_SIZE;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > MAX_PAGE_SIZE) {
    throw apiError.invalidRequest(`limit must be an integer between 1 and ${MAX_PAGE_SIZE}.`, [
      { field: "limit", message: `Expected 1–${MAX_PAGE_SIZE}, received "${raw}".` },
    ]);
  }
  return value;
}
