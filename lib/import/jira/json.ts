/**
 * Jira REST search JSON -> NormalizedIssue[].
 *
 * Target payload — the response body of:
 *   GET /rest/api/3/search?jql=project=ACME&maxResults=100
 *       &fields=*all&expand=changelog,renderedFields,names
 *
 * Also accepts Jira Server / Data Center (`/rest/api/2/...`, plain-text
 * bodies instead of ADF) and a bare `[...]` array of issues, because people
 * concatenate paginated responses by hand.
 *
 * This is the richest export Jira offers and the reason it is the primary
 * format: it is the only one carrying changelog (-> IssueHistory), worklog
 * authors, attachment metadata, and issue links. See the CSV parser for what
 * the UI export can and cannot give you.
 */
import { toDate } from "../dates";
import { adfToText, htmlToText } from "../adf";
import { parseJiraKey } from "../mapping";
import type {
  JiraUserRef,
  NormalizedAttachment,
  NormalizedComment,
  NormalizedCustomField,
  NormalizedHistory,
  NormalizedIssue,
  NormalizedLink,
  NormalizedSprint,
  NormalizedWorkLog,
  RowIssue,
} from "../types";

type Json = Record<string, any>;

export type JsonParseResult = {
  issues: NormalizedIssue[];
  rowIssues: RowIssue[];
  /** Rows present in the file, including ones that failed. */
  sourceRowCount: number;
};

/** Jira story-point custom field ids, in the order Jira itself has used them. */
const STORY_POINT_FIELD_NAMES = ["story points", "story point estimate", "storypoints"];

const SPRINT_FIELD_NAME = "sprint";
const EPIC_LINK_FIELD_NAME = "epic link";

/**
 * Legacy greenhopper sprint serialisation, still emitted by older Jira Server:
 *   com.atlassian.greenhopper.service.sprint.Sprint@1a2b[id=5,name=Sprint 3,state=CLOSED,...]
 */
const LEGACY_SPRINT = /\[(.*)\]$/;

export function parseJiraJson(raw: unknown): JsonParseResult {
  const rowIssues: RowIssue[] = [];
  const rawIssues = extractIssueArray(raw);

  if (!rawIssues) {
    throw new Error(
      "Unrecognised Jira JSON. Expected a search response with an `issues` array, or a bare array of issues."
    );
  }

  // `expand=names` gives customfield_10016 -> "Story Points". Without it we
  // fall back to per-issue `names`, then to nothing (custom fields are then
  // reported as unnamed rather than guessed at).
  const fieldNames: Record<string, string> = isObject(raw) ? (raw as Json).names ?? {} : {};

  const issues: NormalizedIssue[] = [];

  rawIssues.forEach((rawIssue, index) => {
    const row = index + 1;
    try {
      const normalized = normalizeIssue(rawIssue, row, fieldNames);
      if (normalized) issues.push(normalized);
      else {
        rowIssues.push({
          row,
          jiraKey: typeof rawIssue?.key === "string" ? rawIssue.key : null,
          field: "key",
          severity: "error",
          message: `Skipped: missing or malformed issue key (expected e.g. "ACME-42", got ${JSON.stringify(rawIssue?.key ?? null)}).`,
        });
      }
    } catch (e) {
      rowIssues.push({
        row,
        jiraKey: typeof rawIssue?.key === "string" ? rawIssue.key : null,
        field: null,
        severity: "error",
        message: `Skipped: ${e instanceof Error ? e.message : "unreadable row"}`,
      });
    }
  });

  return { issues, rowIssues, sourceRowCount: rawIssues.length };
}

function extractIssueArray(raw: unknown): Json[] | null {
  if (Array.isArray(raw)) return raw as Json[];
  if (!isObject(raw)) return null;
  const obj = raw as Json;
  if (Array.isArray(obj.issues)) return obj.issues as Json[];
  // A single issue fetched from /rest/api/3/issue/ACME-42.
  if (typeof obj.key === "string" && isObject(obj.fields)) return [obj];
  return null;
}

function normalizeIssue(raw: Json, row: number, fieldNames: Record<string, string>): NormalizedIssue | null {
  const parsedKey = parseJiraKey(raw?.key);
  if (!parsedKey) return null;

  const fields: Json = isObject(raw.fields) ? raw.fields : {};
  const rendered: Json = isObject(raw.renderedFields) ? raw.renderedFields : {};

  const summary = typeof fields.summary === "string" ? fields.summary.trim() : "";

  return {
    sourceRow: row,
    jiraKey: String(raw.key).toUpperCase(),
    jiraProjectKey: fields.project?.key ? String(fields.project.key).toUpperCase() : parsedKey.projectKey,
    jiraNumber: parsedKey.number,
    // An issue with no summary is still worth importing — losing the row would
    // lose its comments and history too. The key is a usable placeholder.
    summary: summary || `${raw.key} (no summary in export)`,
    description: htmlToText(rendered.description) ?? adfToText(fields.description),
    typeName: fields.issuetype?.name ? String(fields.issuetype.name) : null,
    isSubtask: Boolean(fields.issuetype?.subtask),
    statusName: fields.status?.name ? String(fields.status.name) : null,
    statusCategoryKey: fields.status?.statusCategory?.key ? String(fields.status.statusCategory.key) : null,
    priorityName: fields.priority?.name ? String(fields.priority.name) : null,
    storyPoints: findStoryPoints(fields, fieldNames),
    originalEstimateSeconds: numberOrNull(fields.timeoriginalestimate ?? fields.timeestimate),
    reporter: userRef(fields.reporter),
    assignee: userRef(fields.assignee),
    parentKey: findParentKey(fields, fieldNames),
    labels: stringArray(fields.labels),
    components: namedArray(fields.components),
    createdAt: toDate(fields.created),
    updatedAt: toDate(fields.updated),
    startDate: toDate(fields.customfield_10015 ?? fields.startDate),
    dueDate: toDate(fields.duedate),
    sprints: findSprints(fields, fieldNames),
    comments: parseComments(fields, rendered),
    workLogs: parseWorkLogs(fields),
    history: parseChangelog(raw),
    attachments: parseAttachments(fields),
    links: parseLinks(fields),
    customFields: parseCustomFields(fields, fieldNames),
  };
}

// ─── Users ──────────────────────────────────────────────────────────────────

function userRef(raw: unknown): JiraUserRef | null {
  if (!isObject(raw)) return null;
  const u = raw as Json;
  const email = typeof u.emailAddress === "string" ? u.emailAddress.trim().toLowerCase() : undefined;
  const accountId = typeof u.accountId === "string" ? u.accountId : typeof u.key === "string" ? u.key : undefined;
  const displayName = typeof u.displayName === "string" ? u.displayName.trim() : undefined;
  if (!email && !accountId && !displayName) return null;
  return { email: email || undefined, accountId, displayName };
}

// ─── Child collections ──────────────────────────────────────────────────────

function parseComments(fields: Json, rendered: Json): NormalizedComment[] {
  const list: Json[] = Array.isArray(fields.comment?.comments) ? fields.comment.comments : [];
  const renderedList: Json[] = Array.isArray(rendered.comment?.comments) ? rendered.comment.comments : [];

  return list.flatMap((c, i) => {
    const body = htmlToText(renderedList[i]?.body) ?? adfToText(c?.body);
    const createdAt = toDate(c?.created);
    if (!body || !createdAt) return [];
    return [{
      externalId: c?.id ? String(c.id) : undefined,
      author: userRef(c?.author),
      body,
      createdAt,
    }];
  });
}

function parseWorkLogs(fields: Json): NormalizedWorkLog[] {
  const list: Json[] = Array.isArray(fields.worklog?.worklogs)
    ? fields.worklog.worklogs
    : Array.isArray(fields.worklogs)
      ? fields.worklogs
      : [];

  return list.flatMap((w) => {
    const seconds = numberOrNull(w?.timeSpentSeconds);
    const startedAt = toDate(w?.started) ?? toDate(w?.created);
    if (!seconds || seconds <= 0 || !startedAt) return [];
    return [{
      externalId: w?.id ? String(w.id) : undefined,
      author: userRef(w?.author),
      seconds,
      comment: adfToText(w?.comment) ?? undefined,
      startedAt,
    }];
  });
}

/**
 * Jira's changelog is a list of histories, each holding several field-level
 * `items`. Trackly's IssueHistory is one row per field change, so this
 * flattens one level.
 */
function parseChangelog(raw: Json): NormalizedHistory[] {
  const histories: Json[] = Array.isArray(raw?.changelog?.histories) ? raw.changelog.histories : [];

  return histories.flatMap((h) => {
    const createdAt = toDate(h?.created);
    if (!createdAt) return [];
    const author = userRef(h?.author);
    const items: Json[] = Array.isArray(h?.items) ? h.items : [];

    return items.map((item, i) => ({
      externalId: h?.id ? `${h.id}:${i}` : undefined,
      author,
      field: String(item?.field ?? item?.fieldId ?? "unknown"),
      fromValue: stringOrNull(item?.fromString ?? item?.from),
      toValue: stringOrNull(item?.toString ?? item?.to),
      createdAt,
    }));
  });
}

function parseAttachments(fields: Json): NormalizedAttachment[] {
  const list: Json[] = Array.isArray(fields.attachment) ? fields.attachment : [];

  return list.flatMap((a) => {
    const filename = stringOrNull(a?.filename);
    const url = stringOrNull(a?.content);
    const createdAt = toDate(a?.created);
    if (!filename || !url || !createdAt) return [];
    return [{
      externalId: a?.id ? String(a.id) : undefined,
      uploader: userRef(a?.author),
      filename,
      url,
      mimeType: stringOrNull(a?.mimeType) ?? "application/octet-stream",
      sizeBytes: numberOrNull(a?.size) ?? 0,
      createdAt,
    }];
  });
}

function parseLinks(fields: Json): NormalizedLink[] {
  const list: Json[] = Array.isArray(fields.issuelinks) ? fields.issuelinks : [];

  return list.flatMap((l): NormalizedLink[] => {
    const typeName = stringOrNull(l?.type?.name);
    if (!typeName) return [];
    if (l?.outwardIssue?.key) {
      return [{ relationName: typeName, direction: "outward", otherKey: String(l.outwardIssue.key).toUpperCase() }];
    }
    if (l?.inwardIssue?.key) {
      return [{ relationName: typeName, direction: "inward", otherKey: String(l.inwardIssue.key).toUpperCase() }];
    }
    return [];
  });
}

// ─── Custom fields ──────────────────────────────────────────────────────────

function customFieldEntries(fields: Json): [string, unknown][] {
  return Object.entries(fields).filter(([k]) => k.startsWith("customfield_"));
}

function fieldLabel(fieldId: string, fieldNames: Record<string, string>): string {
  return fieldNames[fieldId] ?? fieldId;
}

function findStoryPoints(fields: Json, fieldNames: Record<string, string>): number | null {
  for (const [id, value] of customFieldEntries(fields)) {
    const label = fieldLabel(id, fieldNames).toLowerCase();
    if (STORY_POINT_FIELD_NAMES.includes(label)) {
      const n = numberOrNull(value);
      if (n != null) return n;
    }
  }
  // Without `expand=names` there is no label to match on, so fall back to the
  // two ids Atlassian actually ships.
  return numberOrNull(fields.customfield_10016) ?? numberOrNull(fields.customfield_10026);
}

function findParentKey(fields: Json, fieldNames: Record<string, string>): string | null {
  if (fields.parent?.key) return String(fields.parent.key).toUpperCase();
  for (const [id, value] of customFieldEntries(fields)) {
    if (fieldLabel(id, fieldNames).toLowerCase() === EPIC_LINK_FIELD_NAME && typeof value === "string") {
      return value.toUpperCase();
    }
  }
  const epicLink = fields.customfield_10014;
  return typeof epicLink === "string" ? epicLink.toUpperCase() : null;
}

function findSprints(fields: Json, fieldNames: Record<string, string>): NormalizedSprint[] {
  const candidates: unknown[] = [];
  for (const [id, value] of customFieldEntries(fields)) {
    if (fieldLabel(id, fieldNames).toLowerCase() === SPRINT_FIELD_NAME) candidates.push(value);
  }
  if (candidates.length === 0 && fields.customfield_10020 != null) candidates.push(fields.customfield_10020);
  if (candidates.length === 0 && fields.sprint != null) candidates.push(fields.sprint);

  const out: NormalizedSprint[] = [];
  for (const candidate of candidates) {
    for (const entry of Array.isArray(candidate) ? candidate : [candidate]) {
      const sprint = normalizeSprintEntry(entry);
      if (sprint) out.push(sprint);
    }
  }
  return out;
}

function normalizeSprintEntry(entry: unknown): NormalizedSprint | null {
  if (isObject(entry)) {
    const s = entry as Json;
    const name = stringOrNull(s.name);
    if (!name) return null;
    return {
      externalId: s.id != null ? String(s.id) : undefined,
      name,
      state: stringOrNull(s.state) ?? undefined,
      startDate: toDate(s.startDate),
      endDate: toDate(s.endDate ?? s.completeDate),
    };
  }

  if (typeof entry !== "string") return null;
  const m = LEGACY_SPRINT.exec(entry);
  if (!m) return entry.trim() ? { name: entry.trim(), startDate: null, endDate: null } : null;

  const attrs: Record<string, string> = {};
  for (const pair of m[1].split(",")) {
    const eq = pair.indexOf("=");
    if (eq > 0) attrs[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim();
  }
  if (!attrs.name || attrs.name === "<null>") return null;

  return {
    externalId: attrs.id,
    name: attrs.name,
    state: attrs.state,
    startDate: toDate(nullish(attrs.startDate)),
    endDate: toDate(nullish(attrs.endDate) ?? nullish(attrs.completeDate)),
  };
}

function parseCustomFields(fields: Json, fieldNames: Record<string, string>): NormalizedCustomField[] {
  const out: NormalizedCustomField[] = [];
  for (const [id, value] of customFieldEntries(fields)) {
    if (value == null) continue;
    const name = fieldLabel(id, fieldNames);
    // Sprint / story points / epic link are already mapped onto first-class
    // Trackly columns; re-importing them as custom fields would duplicate them.
    const lower = name.toLowerCase();
    if (lower === SPRINT_FIELD_NAME || lower === EPIC_LINK_FIELD_NAME || STORY_POINT_FIELD_NAMES.includes(lower)) {
      continue;
    }
    out.push({ name, value: flattenValue(value) });
  }
  return out;
}

function flattenValue(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    const parts = value.map(flattenValue).filter(Boolean);
    return parts.length ? parts.join(", ") : null;
  }
  if (isObject(value)) {
    const v = value as Json;
    return stringOrNull(v.value ?? v.name ?? v.displayName) ?? adfToText(value);
  }
  return null;
}

// ─── Coercion helpers ───────────────────────────────────────────────────────

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function stringOrNull(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number") return String(value);
  return null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((v) => stringOrNull(v)).filter((v): v is string => !!v) : [];
}

function namedArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((v) => (isObject(v) ? stringOrNull((v as Json).name) : stringOrNull(v))).filter((v): v is string => !!v)
    : [];
}

function nullish(value: string | undefined): string | null {
  return !value || value === "<null>" || value === "null" ? null : value;
}
