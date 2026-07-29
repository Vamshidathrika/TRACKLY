/**
 * Shared vocabulary for the Jira importer.
 *
 * Both source formats (Jira REST JSON and Jira CSV) are normalised into
 * `NormalizedIssue` before anything touches Prisma. Everything downstream —
 * mapping, planning, dry-run reporting, execution — reads only this IR, so
 * adding a third source format means adding one parser and nothing else.
 */
import type { IssueType, IssueStatus, IssuePriority, LinkRelation, SprintStatus } from "@prisma/client";

// ─── Source format ──────────────────────────────────────────────────────────

export type ImportSource = "JIRA_JSON" | "JIRA_CSV";

// ─── Normalised intermediate representation ─────────────────────────────────

/**
 * A reference to a Jira user. Jira Cloud strips `emailAddress` unless the API
 * token holder has "View user email addresses" permission, so every field here
 * is optional and the resolver has to cope with an accountId and a display
 * name alone. See lib/import/users.ts.
 */
export type JiraUserRef = {
  accountId?: string;
  email?: string;
  displayName?: string;
};

export type NormalizedComment = {
  externalId?: string;
  author: JiraUserRef | null;
  body: string;
  createdAt: Date;
};

export type NormalizedWorkLog = {
  externalId?: string;
  author: JiraUserRef | null;
  /** Jira records seconds; Trackly's WorkLog.hours is hours. */
  seconds: number;
  comment?: string;
  startedAt: Date;
};

export type NormalizedHistory = {
  externalId?: string;
  author: JiraUserRef | null;
  field: string;
  fromValue: string | null;
  toValue: string | null;
  createdAt: Date;
};

export type NormalizedAttachment = {
  externalId?: string;
  uploader: JiraUserRef | null;
  filename: string;
  /**
   * Jira's `content` URL. It is NOT public — fetching it needs the exporting
   * account's credentials. The importer stores the URL verbatim and does not
   * copy bytes into Blob storage; see ImportWarning "attachments-not-copied".
   */
  url: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;
};

export type NormalizedLink = {
  /** Jira link type name as written in the export, e.g. "Blocks", "Cloners". */
  relationName: string;
  direction: "inward" | "outward";
  /** The Jira key on the other end, e.g. "ACME-9". */
  otherKey: string;
};

export type NormalizedSprint = {
  externalId?: string;
  name: string;
  state?: string;
  startDate: Date | null;
  endDate: Date | null;
};

export type NormalizedCustomField = {
  name: string;
  value: string | null;
};

export type NormalizedIssue = {
  /** 1-based position in the source file. The anchor for every row error. */
  sourceRow: number;
  /** e.g. "ACME-42" */
  jiraKey: string;
  /** e.g. "ACME" */
  jiraProjectKey: string;
  /** e.g. 42 — the numeric suffix, and the idempotency key. */
  jiraNumber: number;
  summary: string;
  description: string | null;
  typeName: string | null;
  isSubtask: boolean;
  statusName: string | null;
  /** Jira status category key: "new" | "indeterminate" | "done". */
  statusCategoryKey: string | null;
  priorityName: string | null;
  storyPoints: number | null;
  originalEstimateSeconds: number | null;
  reporter: JiraUserRef | null;
  assignee: JiraUserRef | null;
  /** Parent or epic-link Jira key. */
  parentKey: string | null;
  labels: string[];
  components: string[];
  createdAt: Date | null;
  updatedAt: Date | null;
  startDate: Date | null;
  dueDate: Date | null;
  sprints: NormalizedSprint[];
  comments: NormalizedComment[];
  workLogs: NormalizedWorkLog[];
  history: NormalizedHistory[];
  attachments: NormalizedAttachment[];
  links: NormalizedLink[];
  customFields: NormalizedCustomField[];
};

// ─── Mapping results ────────────────────────────────────────────────────────

/**
 * The outcome of translating one Jira vocabulary value into a Trackly enum.
 * `exact: false` means a fallback was used and the value belongs in the report.
 */
export type MappedValue<T> = {
  value: T;
  exact: boolean;
  sourceValue: string | null;
};

export type UnmappedKind = "status" | "issueType" | "priority" | "linkType";

export type UnmappedValue = {
  kind: UnmappedKind;
  /** The Jira value we could not translate. */
  sourceValue: string;
  /** The Trackly fallback it was forced into. */
  fallback: string;
  count: number;
};

// ─── Errors and warnings ────────────────────────────────────────────────────

export type RowIssueSeverity = "error" | "warning";

/**
 * One problem with one source row. `error` means the row was NOT imported;
 * `warning` means it was imported with a documented compromise. Both are
 * always surfaced — nothing here is swallowed.
 */
export type RowIssue = {
  row: number;
  jiraKey: string | null;
  field: string | null;
  severity: RowIssueSeverity;
  message: string;
};

/** A whole-run caveat that is not attributable to a single row. */
export type ImportWarning = {
  code: string;
  message: string;
};

// ─── Planning ───────────────────────────────────────────────────────────────

/** A NormalizedIssue that survived mapping, with its Trackly-side values. */
export type PlannedIssue = {
  source: NormalizedIssue;
  type: IssueType;
  status: IssueStatus;
  priority: IssuePriority;
  /** Trackly labels: source labels plus reserved provenance markers. */
  labels: string[];
  storyPoints: number | null;
  /** Jira seconds converted to Trackly hours. */
  originalEstimateHours: number | null;
};

export type PlannedLink = {
  sourceKey: string;
  targetKey: string;
  relation: LinkRelation;
};

export type PlannedSprint = {
  name: string;
  status: SprintStatus;
  startDate: Date | null;
  endDate: Date | null;
  /** Jira keys of the issues assigned to this sprint. */
  issueKeys: string[];
};

/** Everything the importer intends to do to one Jira project. */
export type PlannedProject = {
  jiraProjectKey: string;
  /** Sanitised Trackly project key, e.g. "ACME". */
  tracklyKey: string;
  name: string;
  issues: PlannedIssue[];
  sprints: PlannedSprint[];
  components: string[];
  customFieldNames: string[];
};

export type ImportPlan = {
  source: ImportSource;
  /** Rows present in the file, including ones that failed to parse. */
  sourceRowCount: number;
  projects: PlannedProject[];
  links: PlannedLink[];
  /** parentKey -> childKey edges, applied after all issues exist. */
  parents: { childKey: string; parentKey: string }[];
  unmapped: UnmappedValue[];
  rowIssues: RowIssue[];
  warnings: ImportWarning[];
};

// ─── Execution report ───────────────────────────────────────────────────────

export type ResolvedUserOutcome =
  | "matched-member"
  | "matched-user-no-membership"
  | "stubbed"
  | "stubbed-placeholder-email"
  | "fallback-to-importer"
  | "unresolved";

export type ResolvedUserReport = {
  displayName: string;
  sourceEmail: string | null;
  accountId: string | null;
  outcome: ResolvedUserOutcome;
  /** The Trackly email actually used or created. */
  tracklyEmail: string | null;
};

export type EntityCounts = {
  created: number;
  updated: number;
  skipped: number;
};

export type ImportSummary = {
  projects: EntityCounts;
  issues: EntityCounts;
  sprints: EntityCounts;
  comments: EntityCounts;
  workLogs: EntityCounts;
  history: EntityCounts;
  attachments: EntityCounts;
  links: EntityCounts;
  components: EntityCounts;
  customFields: EntityCounts;
  users: EntityCounts;
};

export type ImportReport = {
  dryRun: boolean;
  source: ImportSource;
  sourceRowCount: number;
  /** Rows that parsed and mapped cleanly enough to be importable. */
  plannedIssueCount: number;
  summary: ImportSummary;
  projects: { jiraProjectKey: string; tracklyKey: string; name: string; issueCount: number }[];
  unmapped: UnmappedValue[];
  rowIssues: RowIssue[];
  warnings: ImportWarning[];
  users: ResolvedUserReport[];
};

// ─── Options ────────────────────────────────────────────────────────────────

export type ImportOptions = {
  dryRun: boolean;
  /**
   * Create Trackly Users for Jira users with no match. When false, unmatched
   * authorship falls back to the importing admin and every fallback is
   * reported.
   */
  createMissingUsers: boolean;
  /**
   * Give newly stubbed users a workspace Membership. Default FALSE and it
   * matters: NextAuth links a Google sign-in to an existing User by email
   * (lib/auth.ts signIn callback), so granting membership here would let
   * anyone controlling an imported address walk into the workspace without an
   * invite. Left false, a stub is an attribution target and nothing more.
   */
  grantMembershipToStubs: boolean;
  /** Optional Jira-project-key -> Trackly-project-key overrides. */
  projectKeyOverrides: Record<string, string>;
};

export const DEFAULT_IMPORT_OPTIONS: ImportOptions = {
  dryRun: true,
  createMissingUsers: true,
  grantMembershipToStubs: false,
  projectKeyOverrides: {},
};

export function emptyCounts(): EntityCounts {
  return { created: 0, updated: 0, skipped: 0 };
}

export function emptySummary(): ImportSummary {
  return {
    projects: emptyCounts(),
    issues: emptyCounts(),
    sprints: emptyCounts(),
    comments: emptyCounts(),
    workLogs: emptyCounts(),
    history: emptyCounts(),
    attachments: emptyCounts(),
    links: emptyCounts(),
    components: emptyCounts(),
    customFields: emptyCounts(),
    users: emptyCounts(),
  };
}
