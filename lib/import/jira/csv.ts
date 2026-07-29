/**
 * Jira CSV export -> NormalizedIssue[].
 *
 * Target file: Jira's "Export > CSV (all fields)" from the issue navigator.
 * It is the export a normal user can produce without an API token, which is
 * why it is supported at all — but it is strictly lossier than the JSON path:
 *
 *   - No changelog. IssueHistory cannot be reconstructed; the importer
 *     synthesises a single "imported" entry instead.
 *   - Comment cells are `date;authorId;body` triples and carry no email, so
 *     comment authors usually resolve to placeholder users.
 *   - Work logs are `date;author;timeSpentSeconds;comment` and are frequently
 *     absent entirely depending on export permissions.
 *
 * The awkward part is repeated headers: three comments produce three columns
 * all named `Comment`. csv-parse.ts stays positional for exactly this reason.
 */
import { parseCsvWithHeader, cell, cells } from "../csv-parse";
import { toDate } from "../dates";
import { parseJiraKey } from "../mapping";
import type {
  JiraUserRef,
  NormalizedAttachment,
  NormalizedComment,
  NormalizedIssue,
  NormalizedLink,
  NormalizedWorkLog,
  RowIssue,
} from "../types";

export type CsvParseIssueResult = {
  issues: NormalizedIssue[];
  rowIssues: RowIssue[];
  sourceRowCount: number;
};

/** Jira renames these between versions; check every spelling. */
const COL = {
  key: ["Issue key", "Key"],
  summary: ["Summary"],
  description: ["Description"],
  type: ["Issue Type", "Issue type"],
  status: ["Status"],
  priority: ["Priority"],
  reporter: ["Reporter"],
  reporterEmail: ["Reporter Email", "Reporter email"],
  assignee: ["Assignee"],
  assigneeEmail: ["Assignee Email", "Assignee email"],
  created: ["Created"],
  updated: ["Updated"],
  due: ["Due Date", "Due date", "Due"],
  start: ["Start date", "Start Date"],
  parent: ["Parent", "Parent id", "Parent key"],
  epicLink: ["Custom field (Epic Link)", "Epic Link"],
  storyPoints: ["Custom field (Story Points)", "Custom field (Story point estimate)", "Story Points"],
  originalEstimate: ["Original Estimate", "Original estimate", "Σ Original Estimate"],
  sprint: ["Sprint", "Custom field (Sprint)"],
  labels: ["Labels"],
  component: ["Component/s", "Components", "Component"],
  comment: ["Comment"],
  attachment: ["Attachment"],
  worklog: ["Log Work", "Work log", "Worklog"],
  projectKey: ["Project key", "Project Key"],
  projectName: ["Project name", "Project Name"],
  statusCategory: ["Status Category", "Status category"],
} as const;

/** Jira separates the parts of a composite cell with `;`. */
const PART = ";";

export function parseJiraCsv(text: string): CsvParseIssueResult {
  const { header, rows } = parseCsvWithHeader(text);

  if (!COL.key.some((name) => header.some((h) => h.toLowerCase() === name.toLowerCase()))) {
    throw new Error(
      `Not a Jira CSV export: no "Issue key" column found. Columns seen: ${header.slice(0, 12).join(", ")}${header.length > 12 ? "…" : ""}`
    );
  }

  const rowIssues: RowIssue[] = [];
  const issues: NormalizedIssue[] = [];

  rows.forEach((row, index) => {
    // +2: one for the header row, one to make it 1-based, so the number
    // matches what a spreadsheet shows.
    const rowNumber = index + 2;
    const keyRaw = first(header, row, COL.key);
    const parsedKey = parseJiraKey(keyRaw);

    if (!parsedKey) {
      rowIssues.push({
        row: rowNumber,
        jiraKey: keyRaw,
        field: "Issue key",
        severity: "error",
        message: `Skipped: missing or malformed issue key (expected e.g. "ACME-42", got ${JSON.stringify(keyRaw)}).`,
      });
      return;
    }

    try {
      issues.push(normalizeRow(header, row, rowNumber, keyRaw!, parsedKey));
    } catch (e) {
      rowIssues.push({
        row: rowNumber,
        jiraKey: keyRaw,
        field: null,
        severity: "error",
        message: `Skipped: ${e instanceof Error ? e.message : "unreadable row"}`,
      });
    }
  });

  return { issues, rowIssues, sourceRowCount: rows.length };
}

function normalizeRow(
  header: string[],
  row: string[],
  rowNumber: number,
  keyRaw: string,
  parsedKey: { projectKey: string; number: number }
): NormalizedIssue {
  const summary = first(header, row, COL.summary);
  const typeName = first(header, row, COL.type);
  const parent = first(header, row, COL.parent) ?? first(header, row, COL.epicLink);

  return {
    sourceRow: rowNumber,
    jiraKey: keyRaw.toUpperCase(),
    jiraProjectKey: (first(header, row, COL.projectKey) ?? parsedKey.projectKey).toUpperCase(),
    jiraNumber: parsedKey.number,
    summary: summary ?? `${keyRaw} (no summary in export)`,
    description: first(header, row, COL.description),
    typeName,
    isSubtask: /sub[- ]?task/i.test(typeName ?? ""),
    statusName: first(header, row, COL.status),
    statusCategoryKey: first(header, row, COL.statusCategory)?.toLowerCase() ?? null,
    priorityName: first(header, row, COL.priority),
    storyPoints: numberOrNull(first(header, row, COL.storyPoints)),
    originalEstimateSeconds: numberOrNull(first(header, row, COL.originalEstimate)),
    reporter: csvUser(first(header, row, COL.reporter), first(header, row, COL.reporterEmail)),
    assignee: csvUser(first(header, row, COL.assignee), first(header, row, COL.assigneeEmail)),
    parentKey: parseJiraKey(parent) ? parent!.toUpperCase() : null,
    labels: all(header, row, COL.labels),
    components: all(header, row, COL.component),
    createdAt: toDate(first(header, row, COL.created)),
    updatedAt: toDate(first(header, row, COL.updated)),
    startDate: toDate(first(header, row, COL.start)),
    dueDate: toDate(first(header, row, COL.due)),
    sprints: all(header, row, COL.sprint).map((name) => ({ name, startDate: null, endDate: null })),
    comments: parseComments(all(header, row, COL.comment)),
    workLogs: parseWorkLogs(all(header, row, COL.worklog)),
    // Jira's CSV has no changelog at all. Left empty rather than fabricated;
    // lib/import/plan.ts records this as a run-level warning.
    history: [],
    attachments: parseAttachments(all(header, row, COL.attachment)),
    links: parseLinks(header, row),
    customFields: parseCustomFields(header, row),
  };
}

// ─── Composite cells ────────────────────────────────────────────────────────

/**
 * `10/Mar/24 2:11 PM;557058:abc-123;The body, which may itself contain ; chars`
 * Only the first two separators are structural, so the body is rejoined.
 */
function parseComments(raw: string[]): NormalizedComment[] {
  return raw.flatMap((value) => {
    const parts = value.split(PART);
    if (parts.length < 3) {
      // No metadata prefix — treat the whole cell as the body. Losing a comment
      // because its author is unknown would be worse than an unattributed one.
      const body = value.trim();
      return body ? [{ author: null, body, createdAt: new Date(0) }] : [];
    }
    const createdAt = toDate(parts[0]);
    const body = parts.slice(2).join(PART).trim();
    if (!body) return [];
    return [{ author: csvUser(parts[1], null), body, createdAt: createdAt ?? new Date(0) }];
  });
}

/** `10/Mar/24 2:11 PM;author;3600;comment` */
function parseWorkLogs(raw: string[]): NormalizedWorkLog[] {
  return raw.flatMap((value) => {
    const parts = value.split(PART);
    if (parts.length < 3) return [];
    const startedAt = toDate(parts[0]);
    const seconds = numberOrNull(parts[2]);
    if (!startedAt || !seconds || seconds <= 0) return [];
    return [{
      author: csvUser(parts[1], null),
      seconds,
      comment: parts.slice(3).join(PART).trim() || undefined,
      startedAt,
    }];
  });
}

/** `10/Mar/24 2:11 PM;author;design.png;https://…/attachment/1/design.png` */
function parseAttachments(raw: string[]): NormalizedAttachment[] {
  return raw.flatMap((value) => {
    const parts = value.split(PART);
    if (parts.length < 4) return [];
    const createdAt = toDate(parts[0]);
    const filename = parts[2]?.trim();
    const url = parts.slice(3).join(PART).trim();
    if (!filename || !url) return [];
    return [{
      uploader: csvUser(parts[1], null),
      filename,
      url,
      mimeType: "application/octet-stream",
      sizeBytes: 0,
      createdAt: createdAt ?? new Date(0),
    }];
  });
}

/**
 * Jira CSV names link columns after the link type: "Outward issue link
 * (Blocks)", "Inward issue link (Blocks)". Each cell holds one target key.
 */
const LINK_HEADER = /^(outward|inward)\s+issue\s+link\s*\((.+)\)$/i;

function parseLinks(header: string[], row: string[]): NormalizedLink[] {
  const out: NormalizedLink[] = [];
  header.forEach((name, i) => {
    const m = LINK_HEADER.exec(name.trim());
    const value = row[i]?.trim();
    if (!m || !value) return;
    if (!parseJiraKey(value)) return;
    out.push({
      relationName: m[2].trim(),
      direction: m[1].toLowerCase() === "outward" ? "outward" : "inward",
      otherKey: value.toUpperCase(),
    });
  });
  return out;
}

const CUSTOM_FIELD_HEADER = /^Custom field\s*\((.+)\)$/i;

/** Custom fields already mapped onto first-class Trackly columns. */
const CUSTOM_FIELD_SKIP = new Set(["sprint", "epic link", "story points", "story point estimate", "rank"]);

function parseCustomFields(header: string[], row: string[]): { name: string; value: string | null }[] {
  const merged = new Map<string, string[]>();
  header.forEach((name, i) => {
    const m = CUSTOM_FIELD_HEADER.exec(name.trim());
    const value = row[i]?.trim();
    if (!m || !value) return;
    const fieldName = m[1].trim();
    if (CUSTOM_FIELD_SKIP.has(fieldName.toLowerCase())) return;
    const bucket = merged.get(fieldName) ?? [];
    bucket.push(value);
    merged.set(fieldName, bucket);
  });
  return [...merged].map(([name, values]) => ({ name, value: values.join(", ") }));
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function first(header: string[], row: string[], names: readonly string[]): string | null {
  for (const name of names) {
    const value = cell(header, row, name);
    if (value) return value;
  }
  return null;
}

function all(header: string[], row: string[], names: readonly string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const name of names) {
    for (const value of cells(header, row, name)) {
      if (!seen.has(value)) {
        seen.add(value);
        out.push(value);
      }
    }
  }
  return out;
}

/**
 * A CSV user cell is a display name or an opaque accountId, and Jira Cloud
 * exports never include the email unless the admin added the column. The email
 * argument is the separate "Reporter Email"-style column when present.
 */
function csvUser(nameOrId: string | null | undefined, email: string | null | undefined): JiraUserRef | null {
  const raw = nameOrId?.trim();
  const mail = email?.trim().toLowerCase();
  if (!raw && !mail) return null;
  if (raw && /^(unassigned|none|-)$/i.test(raw) && !mail) return null;

  // "557058:9d1f…" and "JIRAUSER10100" are account ids, not names.
  const looksLikeAccountId = !!raw && (/^\d{6}:[0-9a-f-]{8,}$/i.test(raw) || /^JIRAUSER\d+$/i.test(raw));

  return {
    email: mail || undefined,
    accountId: looksLikeAccountId ? raw : undefined,
    displayName: looksLikeAccountId ? undefined : raw || undefined,
  };
}

function numberOrNull(value: string | null | undefined): number | null {
  if (!value) return null;
  const n = Number(value.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}
