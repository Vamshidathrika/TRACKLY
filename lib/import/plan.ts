/**
 * Turn NormalizedIssue[] into an ImportPlan.
 *
 * Pure — no Prisma, no I/O, no clock. Everything that can be decided from the
 * file alone is decided here: enum mapping, fallback accounting, duplicate
 * detection, dangling parent/link detection, project grouping. That makes the
 * dry-run report cheap to compute and, more importantly, makes all of it
 * unit-testable without a database.
 *
 * What is NOT decided here: which rows already exist in Trackly (a DB read)
 * and how users resolve (a DB read). Those live in run.ts.
 */
import {
  mapIssueType,
  mapLinkRelation,
  mapPriority,
  mapSprintStatus,
  mapStatus,
  componentLabel,
  jiraKeyLabel,
  sanitiseProjectKey,
  stripReservedLabels,
} from "./mapping";
import { secondsToHours } from "./dates";
import type {
  ImportPlan,
  ImportSource,
  ImportWarning,
  NormalizedIssue,
  PlannedIssue,
  PlannedLink,
  PlannedProject,
  PlannedSprint,
  RowIssue,
  UnmappedKind,
  UnmappedValue,
} from "./types";

export type PlanInput = {
  source: ImportSource;
  issues: NormalizedIssue[];
  /** Row problems already found by the parser; carried through, never dropped. */
  rowIssues: RowIssue[];
  sourceRowCount: number;
  projectKeyOverrides?: Record<string, string>;
};

/** Accumulates inexact mappings so the report can show "23 issues used status X". */
class UnmappedRegistry {
  private readonly entries = new Map<string, UnmappedValue>();

  record(kind: UnmappedKind, sourceValue: string | null, fallback: string) {
    if (!sourceValue) return;
    const id = `${kind}::${sourceValue.toLowerCase()}`;
    const existing = this.entries.get(id);
    if (existing) existing.count += 1;
    else this.entries.set(id, { kind, sourceValue, fallback, count: 1 });
  }

  toArray(): UnmappedValue[] {
    return [...this.entries.values()].sort((a, b) => b.count - a.count || a.sourceValue.localeCompare(b.sourceValue));
  }
}

export function planImport(input: PlanInput): ImportPlan {
  const rowIssues: RowIssue[] = [...input.rowIssues];
  const warnings: ImportWarning[] = [];
  const unmapped = new UnmappedRegistry();
  const overrides = input.projectKeyOverrides ?? {};

  const { issues, duplicates } = dedupe(input.issues);
  rowIssues.push(...duplicates);

  const byKey = new Map(issues.map((i) => [i.jiraKey, i]));
  const projects = new Map<string, PlannedProject>();
  const links: PlannedLink[] = [];
  const parents: { childKey: string; parentKey: string }[] = [];
  const seenLinks = new Set<string>();

  for (const issue of issues) {
    const project = ensureProject(projects, issue.jiraProjectKey, overrides);
    project.issues.push(planIssue(issue, unmapped, rowIssues));

    collectSprints(project, issue);
    collectComponents(project, issue);
    collectCustomFields(project, issue);
    collectParent(issue, byKey, parents, rowIssues);
    collectLinks(issue, byKey, links, seenLinks, unmapped, rowIssues);
    collectRowWarnings(issue, rowIssues);
  }

  warnings.push(...planWarnings(input.source, issues, projects));

  return {
    source: input.source,
    sourceRowCount: input.sourceRowCount,
    projects: [...projects.values()].sort((a, b) => a.jiraProjectKey.localeCompare(b.jiraProjectKey)),
    links,
    parents,
    unmapped: unmapped.toArray(),
    rowIssues: rowIssues.sort((a, b) => a.row - b.row),
    warnings,
  };
}

// ─── Duplicates ─────────────────────────────────────────────────────────────

/**
 * Concatenated paginated exports routinely repeat issues. Last write wins —
 * later pages are the fresher fetch — and every drop is reported.
 */
function dedupe(issues: NormalizedIssue[]): { issues: NormalizedIssue[]; duplicates: RowIssue[] } {
  const byKey = new Map<string, NormalizedIssue>();
  const duplicates: RowIssue[] = [];

  for (const issue of issues) {
    const previous = byKey.get(issue.jiraKey);
    if (previous) {
      duplicates.push({
        row: previous.sourceRow,
        jiraKey: issue.jiraKey,
        field: null,
        severity: "warning",
        message: `Duplicate of row ${issue.sourceRow}; the later row was used and this one ignored.`,
      });
    }
    byKey.set(issue.jiraKey, issue);
  }

  return { issues: [...byKey.values()], duplicates };
}

// ─── Per-issue planning ─────────────────────────────────────────────────────

function planIssue(issue: NormalizedIssue, unmapped: UnmappedRegistry, rowIssues: RowIssue[]): PlannedIssue {
  const type = mapIssueType(issue.typeName, issue.isSubtask);
  const status = mapStatus(issue.statusName, issue.statusCategoryKey);
  const priority = mapPriority(issue.priorityName);

  if (!type.exact) unmapped.record("issueType", type.sourceValue, type.value);
  if (!status.exact) unmapped.record("status", status.sourceValue, status.value);
  if (!priority.exact) unmapped.record("priority", priority.sourceValue, priority.value);

  if (issue.customFields.length > 0) {
    rowIssues.push({
      row: issue.sourceRow,
      jiraKey: issue.jiraKey,
      field: "custom fields",
      severity: "warning",
      // Trackly's CustomField model holds definitions only — there is no
      // per-issue value table — so the values genuinely cannot land anywhere.
      message: `${issue.customFields.length} custom field value(s) dropped (${issue.customFields
        .map((f) => f.name)
        .slice(0, 4)
        .join(", ")}${issue.customFields.length > 4 ? "…" : ""}). Trackly stores custom field definitions but not per-issue values.`,
    });
  }

  return {
    source: issue,
    type: type.value,
    status: status.value,
    priority: priority.value,
    labels: buildLabels(issue),
    storyPoints: issue.storyPoints,
    originalEstimateHours: secondsToHours(issue.originalEstimateSeconds),
  };
}

/**
 * Trackly labels carry three things: the author's own labels, a `jira:` origin
 * marker, and `component:` markers standing in for the ProjectComponent link
 * that Issue does not have.
 */
function buildLabels(issue: NormalizedIssue): string[] {
  const labels = new Set<string>(stripReservedLabels(issue.labels));
  labels.add(jiraKeyLabel(issue.jiraKey));
  for (const component of issue.components) labels.add(componentLabel(component));
  return [...labels];
}

// ─── Grouping ───────────────────────────────────────────────────────────────

function ensureProject(
  projects: Map<string, PlannedProject>,
  jiraProjectKey: string,
  overrides: Record<string, string>
): PlannedProject {
  const existing = projects.get(jiraProjectKey);
  if (existing) return existing;

  const override = overrides[jiraProjectKey];
  const created: PlannedProject = {
    jiraProjectKey,
    tracklyKey: sanitiseProjectKey(override || jiraProjectKey),
    name: jiraProjectKey,
    issues: [],
    sprints: [],
    components: [],
    customFieldNames: [],
  };
  projects.set(jiraProjectKey, created);
  return created;
}

function collectSprints(project: PlannedProject, issue: NormalizedIssue) {
  // Jira keeps every sprint an issue has ever been in. Only the last one is
  // its current sprint, but all of them are real sprints worth creating.
  issue.sprints.forEach((sprint, index) => {
    let planned = project.sprints.find((s) => s.name === sprint.name);
    if (!planned) {
      planned = {
        name: sprint.name,
        status: mapSprintStatus(sprint.state),
        startDate: sprint.startDate,
        endDate: sprint.endDate,
        issueKeys: [],
      };
      project.sprints.push(planned);
    } else {
      planned.startDate ??= sprint.startDate;
      planned.endDate ??= sprint.endDate;
    }
    // Trackly's Issue.sprintId is single-valued, so only the final sprint
    // owns the issue.
    if (index === issue.sprints.length - 1) planned.issueKeys.push(issue.jiraKey);
  });
}

function collectComponents(project: PlannedProject, issue: NormalizedIssue) {
  for (const component of issue.components) {
    if (!project.components.includes(component)) project.components.push(component);
  }
}

function collectCustomFields(project: PlannedProject, issue: NormalizedIssue) {
  for (const field of issue.customFields) {
    if (!project.customFieldNames.includes(field.name)) project.customFieldNames.push(field.name);
  }
}

// ─── Cross-issue references ─────────────────────────────────────────────────

function collectParent(
  issue: NormalizedIssue,
  byKey: Map<string, NormalizedIssue>,
  parents: { childKey: string; parentKey: string }[],
  rowIssues: RowIssue[]
) {
  if (!issue.parentKey) return;

  const parent = byKey.get(issue.parentKey);
  if (!parent) {
    rowIssues.push({
      row: issue.sourceRow,
      jiraKey: issue.jiraKey,
      field: "parent",
      severity: "warning",
      message: `Parent ${issue.parentKey} is not in this export; the issue was imported without a parent. Re-export including ${issue.parentKey} and re-run to attach it.`,
    });
    return;
  }

  if (parent.jiraProjectKey !== issue.jiraProjectKey) {
    // Trackly has no cross-project hierarchy; Issue.parentId points at an
    // Issue but the board only ever renders same-project subtasks.
    rowIssues.push({
      row: issue.sourceRow,
      jiraKey: issue.jiraKey,
      field: "parent",
      severity: "warning",
      message: `Parent ${issue.parentKey} belongs to a different project (${parent.jiraProjectKey}); the parent link was skipped.`,
    });
    return;
  }

  parents.push({ childKey: issue.jiraKey, parentKey: issue.parentKey });
}

function collectLinks(
  issue: NormalizedIssue,
  byKey: Map<string, NormalizedIssue>,
  links: PlannedLink[],
  seen: Set<string>,
  unmapped: UnmappedRegistry,
  rowIssues: RowIssue[]
) {
  for (const link of issue.links) {
    if (!byKey.has(link.otherKey)) {
      rowIssues.push({
        row: issue.sourceRow,
        jiraKey: issue.jiraKey,
        field: "issue link",
        severity: "warning",
        message: `Link "${link.relationName}" to ${link.otherKey} skipped: ${link.otherKey} is not in this export.`,
      });
      continue;
    }

    const mapped = mapLinkRelation(link);
    if (!mapped.exact) unmapped.record("linkType", mapped.sourceValue, mapped.value);

    // Jira exports both ends of every link, so each one arrives twice.
    const id = `${issue.jiraKey}->${link.otherKey}:${mapped.value}`;
    if (seen.has(id)) continue;
    seen.add(id);

    links.push({ sourceKey: issue.jiraKey, targetKey: link.otherKey, relation: mapped.value });
  }
}

function collectRowWarnings(issue: NormalizedIssue, rowIssues: RowIssue[]) {
  if (!issue.reporter) {
    rowIssues.push({
      row: issue.sourceRow,
      jiraKey: issue.jiraKey,
      field: "reporter",
      severity: "warning",
      message: "No reporter in the export; the issue will be attributed to the admin running the import.",
    });
  }
  if (issue.attachments.length > 0) {
    rowIssues.push({
      row: issue.sourceRow,
      jiraKey: issue.jiraKey,
      field: "attachments",
      severity: "warning",
      message: `${issue.attachments.length} attachment(s) recorded as Jira URLs. The files are NOT copied into Trackly and the links need Jira credentials to open.`,
    });
  }
}

// ─── Run-level warnings ─────────────────────────────────────────────────────

function planWarnings(
  source: ImportSource,
  issues: NormalizedIssue[],
  projects: Map<string, PlannedProject>
): ImportWarning[] {
  const warnings: ImportWarning[] = [];

  if (source === "JIRA_CSV") {
    warnings.push({
      code: "csv-no-changelog",
      message:
        "Jira's CSV export contains no change history, so issue history could not be reconstructed. Use the REST API export (expand=changelog) if history matters.",
    });
    warnings.push({
      code: "csv-weak-user-identity",
      message:
        "Jira CSV identifies comment and work-log authors by display name or account id, not email, so many of them resolve to placeholder users.",
    });
  }

  if (issues.some((i) => i.components.length > 0)) {
    warnings.push({
      code: "components-as-labels",
      message:
        "Trackly issues have no component field. Components are created on the project and recorded on each issue as a `component:` label.",
    });
  }

  if (issues.some((i) => i.attachments.length > 0)) {
    warnings.push({
      code: "attachments-not-copied",
      message:
        "Attachment files are not downloaded. Trackly stores the original Jira URLs, which require Jira credentials to open.",
    });
  }

  if (projects.size > 1) {
    warnings.push({
      code: "multi-project",
      message: `The export spans ${projects.size} Jira projects. Each becomes a separate Trackly project; review the generated project keys before running for real.`,
    });
  }

  return warnings;
}
