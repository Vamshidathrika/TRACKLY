/**
 * Jira vocabulary -> Trackly enums.
 *
 * Trackly's enums are deliberately small (4 statuses, 5 types, 5 priorities)
 * while Jira's are unbounded and per-project. Every function here is total:
 * it always returns a value, and it flags `exact: false` when a fallback was
 * used so the caller can put the original in the report. Nothing is dropped
 * silently.
 */
import type { IssueType, IssueStatus, IssuePriority, LinkRelation, SprintStatus } from "@prisma/client";
import type { MappedValue, NormalizedLink } from "./types";

// ─── Fallbacks ──────────────────────────────────────────────────────────────

export const FALLBACK_STATUS: IssueStatus = "TO_DO";
export const FALLBACK_TYPE: IssueType = "TASK";
export const FALLBACK_PRIORITY: IssuePriority = "MEDIUM";
export const FALLBACK_LINK: LinkRelation = "RELATES_TO";

/**
 * Provenance and lossy-mapping markers written into Issue.labels.
 *
 * `jira:` records the origin key so a re-run (or a human) can see where a row
 * came from. `component:` exists because Trackly's Issue has no relation to
 * ProjectComponent — the component names would otherwise be lost entirely.
 * Both are stripped from any label list coming back out of the importer.
 */
export const JIRA_KEY_LABEL_PREFIX = "jira:";
export const COMPONENT_LABEL_PREFIX = "component:";
export const RESERVED_LABEL_PREFIXES = [JIRA_KEY_LABEL_PREFIX, COMPONENT_LABEL_PREFIX];

function normalise(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

// ─── Status ─────────────────────────────────────────────────────────────────

const STATUS_BY_NAME: Record<string, IssueStatus> = {
  "to do": "TO_DO",
  todo: "TO_DO",
  open: "TO_DO",
  new: "TO_DO",
  backlog: "TO_DO",
  "selected for development": "TO_DO",
  reopened: "TO_DO",
  "in progress": "IN_PROGRESS",
  "in development": "IN_PROGRESS",
  "in dev": "IN_PROGRESS",
  doing: "IN_PROGRESS",
  started: "IN_PROGRESS",
  "in review": "IN_REVIEW",
  "code review": "IN_REVIEW",
  "in qa": "IN_REVIEW",
  qa: "IN_REVIEW",
  testing: "IN_REVIEW",
  "ready for review": "IN_REVIEW",
  verified: "IN_REVIEW",
  done: "DONE",
  closed: "DONE",
  resolved: "DONE",
  complete: "DONE",
  completed: "DONE",
  cancelled: "DONE",
  canceled: "DONE",
  "won't do": "DONE",
  "wont do": "DONE",
};

/** Jira's statusCategory is the only cross-project-stable signal it exposes. */
const STATUS_BY_CATEGORY: Record<string, IssueStatus> = {
  new: "TO_DO",
  undefined: "TO_DO",
  indeterminate: "IN_PROGRESS",
  done: "DONE",
};

/**
 * Resolution order: exact name, then review-ish keywords, then Jira's status
 * category, then the fallback. The category check sits BELOW the keyword check
 * because Jira lumps every review column into "indeterminate", which would
 * flatten a real IN_REVIEW column into IN_PROGRESS.
 */
export function mapStatus(
  statusName: string | null | undefined,
  statusCategoryKey?: string | null
): MappedValue<IssueStatus> {
  const name = normalise(statusName);
  const source = statusName?.trim() || null;

  const byName = STATUS_BY_NAME[name];
  if (byName) return { value: byName, exact: true, sourceValue: source };

  if (name && /\b(review|qa|test|verif|approv|uat|staging)\b/.test(name)) {
    return { value: "IN_REVIEW", exact: true, sourceValue: source };
  }

  const byCategory = STATUS_BY_CATEGORY[normalise(statusCategoryKey)];
  if (byCategory) {
    // The category is a genuine mapping, not a guess — but it is coarser than
    // the column the team actually used, so it still counts as inexact when
    // the name itself was unrecognised.
    return { value: byCategory, exact: !source, sourceValue: source };
  }

  return { value: FALLBACK_STATUS, exact: !source, sourceValue: source };
}

// ─── Issue type ─────────────────────────────────────────────────────────────

const TYPE_BY_NAME: Record<string, IssueType> = {
  epic: "EPIC",
  initiative: "EPIC",
  theme: "EPIC",
  story: "STORY",
  "user story": "STORY",
  improvement: "STORY",
  "new feature": "STORY",
  feature: "STORY",
  task: "TASK",
  chore: "TASK",
  "service request": "TASK",
  spike: "TASK",
  bug: "BUG",
  defect: "BUG",
  incident: "BUG",
  problem: "BUG",
  "sub-task": "SUBTASK",
  subtask: "SUBTASK",
  "sub task": "SUBTASK",
  "subtask-bug": "SUBTASK",
};

export function mapIssueType(
  typeName: string | null | undefined,
  isSubtask = false
): MappedValue<IssueType> {
  const source = typeName?.trim() || null;

  // Jira's `subtask: true` flag outranks the name: a custom sub-task type
  // called "QA Step" is still structurally a subtask, and importing it as a
  // TASK would orphan it from its parent in the UI.
  if (isSubtask) return { value: "SUBTASK", exact: true, sourceValue: source };

  const byName = TYPE_BY_NAME[normalise(typeName)];
  if (byName) return { value: byName, exact: true, sourceValue: source };

  return { value: FALLBACK_TYPE, exact: !source, sourceValue: source };
}

// ─── Priority ───────────────────────────────────────────────────────────────

const PRIORITY_BY_NAME: Record<string, IssuePriority> = {
  highest: "HIGHEST",
  blocker: "HIGHEST",
  critical: "HIGHEST",
  urgent: "HIGHEST",
  p0: "HIGHEST",
  "1": "HIGHEST",
  high: "HIGH",
  major: "HIGH",
  p1: "HIGH",
  "2": "HIGH",
  medium: "MEDIUM",
  normal: "MEDIUM",
  moderate: "MEDIUM",
  p2: "MEDIUM",
  "3": "MEDIUM",
  low: "LOW",
  minor: "LOW",
  p3: "LOW",
  "4": "LOW",
  lowest: "LOWEST",
  trivial: "LOWEST",
  p4: "LOWEST",
  "5": "LOWEST",
};

export function mapPriority(priorityName: string | null | undefined): MappedValue<IssuePriority> {
  const source = priorityName?.trim() || null;
  const byName = PRIORITY_BY_NAME[normalise(priorityName)];
  if (byName) return { value: byName, exact: true, sourceValue: source };
  return { value: FALLBACK_PRIORITY, exact: !source, sourceValue: source };
}

// ─── Issue links ────────────────────────────────────────────────────────────

/**
 * Jira link types are directional pairs ("blocks" / "is blocked by") on a
 * single named type. Trackly stores direction in the relation itself, so the
 * mapping depends on which end of the link the exported issue sits on.
 */
export function mapLinkRelation(link: Pick<NormalizedLink, "relationName" | "direction">): MappedValue<LinkRelation> {
  const name = normalise(link.relationName);
  const source = link.relationName?.trim() || null;

  if (/block/.test(name)) {
    // "Blocks" is the type name on both ends; direction decides the meaning.
    const value: LinkRelation = link.direction === "outward" ? "BLOCKS" : "IS_BLOCKED_BY";
    return { value, exact: true, sourceValue: source };
  }
  if (/duplicat/.test(name)) return { value: "DUPLICATES", exact: true, sourceValue: source };
  if (/relate/.test(name)) return { value: "RELATES_TO", exact: true, sourceValue: source };

  // Cloners, "Problem/Incident", "Causes", and every custom link type collapse
  // to RELATES_TO. That is a real loss and it goes in the report.
  return { value: FALLBACK_LINK, exact: false, sourceValue: source };
}

// ─── Sprints ────────────────────────────────────────────────────────────────

export function mapSprintStatus(state: string | null | undefined): SprintStatus {
  const name = normalise(state);
  if (name === "active") return "ACTIVE";
  if (name === "closed") return "CLOSED";
  return "FUTURE";
}

// ─── Keys ───────────────────────────────────────────────────────────────────

const JIRA_KEY = /^([A-Za-z][A-Za-z0-9_]*)-(\d+)$/;

/**
 * Split "ACME-42" into its project key and number. The number becomes
 * Trackly's Issue.number, which is what makes re-runs idempotent — see
 * .plan/import-schema.prisma for why this beats a mapping table today.
 */
export function parseJiraKey(key: string | null | undefined): { projectKey: string; number: number } | null {
  const m = JIRA_KEY.exec((key ?? "").trim());
  if (!m) return null;
  const number = Number(m[2]);
  if (!Number.isSafeInteger(number) || number <= 0) return null;
  return { projectKey: m[1].toUpperCase(), number };
}

/**
 * Jira project keys are already `[A-Z][A-Z0-9_]*`, but overrides typed by a
 * human are not. Trackly only constrains uniqueness per site, so this just
 * makes the key presentable and stable.
 */
export function sanitiseProjectKey(key: string): string {
  const cleaned = key.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
  return cleaned || "IMPORT";
}

export function jiraKeyLabel(jiraKey: string): string {
  return `${JIRA_KEY_LABEL_PREFIX}${jiraKey.toUpperCase()}`;
}

export function componentLabel(name: string): string {
  return `${COMPONENT_LABEL_PREFIX}${name}`;
}

/** Labels a human authored, with the importer's bookkeeping markers removed. */
export function stripReservedLabels(labels: string[]): string[] {
  return labels.filter((l) => !RESERVED_LABEL_PREFIXES.some((p) => l.startsWith(p)));
}
