/**
 * Date coercion for Jira exports.
 *
 * Jira emits two shapes and neither is reliably `new Date()`-safe:
 *   REST JSON  "2024-03-11T09:12:44.000+0000"   ISO-ish, but the offset has no
 *                                                colon; some engines reject it.
 *   CSV        "11/Mar/24 9:12 AM"              Jira's default display format,
 *                                                no timezone at all.
 */

const JIRA_CSV_DATE =
  /^(\d{1,2})\/([A-Za-z]{3})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?$/i;

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/** Two-digit years below this roll forward to 20xx, at or above to 19xx. */
const CENTURY_PIVOT = 70;

/**
 * Parse any date Jira might hand us. Returns null rather than an Invalid Date
 * so callers can't accidentally persist NaN timestamps — every caller treats
 * null as "unknown" and reports it.
 */
export function toDate(input: unknown): Date | null {
  if (input instanceof Date) return Number.isNaN(input.getTime()) ? null : input;
  if (typeof input === "number") {
    const fromEpoch = new Date(input);
    return Number.isNaN(fromEpoch.getTime()) ? null : fromEpoch;
  }
  if (typeof input !== "string") return null;

  const raw = input.trim();
  if (!raw) return null;

  const csv = parseJiraCsvDate(raw);
  if (csv) return csv;

  // "+0000" -> "+00:00" so strict ISO parsers accept it.
  const iso = raw.replace(/([+-]\d{2})(\d{2})$/, "$1:$2");
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseJiraCsvDate(raw: string): Date | null {
  const m = JIRA_CSV_DATE.exec(raw);
  if (!m) return null;

  const month = MONTHS[m[2].toLowerCase()];
  if (month === undefined) return null;

  const day = Number(m[1]);
  const yearRaw = Number(m[3]);
  const year =
    m[3].length <= 2 ? (yearRaw < CENTURY_PIVOT ? 2000 + yearRaw : 1900 + yearRaw) : yearRaw;

  let hour = m[4] ? Number(m[4]) : 0;
  const minute = m[5] ? Number(m[5]) : 0;
  const second = m[6] ? Number(m[6]) : 0;
  const meridiem = m[7]?.toUpperCase();

  if (meridiem === "PM" && hour < 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;

  // Jira CSV carries no timezone. UTC is the only defensible reading: guessing
  // the server's local zone would silently shift every timestamp in the export.
  const date = new Date(Date.UTC(year, month, day, hour, minute, second));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Jira tracks time in seconds; Trackly's WorkLog.hours and Issue.originalEstimate are hours. */
export function secondsToHours(seconds: number | null | undefined): number | null {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return null;
  return Math.round((seconds / 3600) * 100) / 100;
}
