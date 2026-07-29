/**
 * Public surface of the Jira importer.
 *
 * The pipeline, in order:
 *
 *   file text
 *     -> parseImportFile()   sniff JSON vs CSV, normalise    (pure)
 *     -> planImport()        map enums, group, find problems (pure)
 *     -> runImport()         resolve users, read, write      (Prisma)
 *     -> ImportReport
 *
 * The first two stages never touch the database, which is why the dry run is
 * cheap and the mapping rules are unit-testable without one.
 */
export { parseImportFile, detectSource, MAX_IMPORT_BYTES, MAX_IMPORT_ISSUES } from "./parse";
export type { ParseResult } from "./parse";

export { planImport } from "./plan";
export type { PlanInput } from "./plan";

export { runImport } from "./run";
export type { RunImportInput } from "./run";

export { UserResolver, identityKey, PLACEHOLDER_EMAIL_DOMAIN } from "./users";

export {
  mapStatus,
  mapIssueType,
  mapPriority,
  mapLinkRelation,
  mapSprintStatus,
  parseJiraKey,
  sanitiseProjectKey,
  stripReservedLabels,
  JIRA_KEY_LABEL_PREFIX,
  COMPONENT_LABEL_PREFIX,
} from "./mapping";

export { startImportJob, finishImportJob, failImportJob, isJobHistoryEnabled } from "./job-store";

export { DEFAULT_IMPORT_OPTIONS, emptyCounts, emptySummary } from "./types";
export type {
  ImportOptions,
  ImportPlan,
  ImportReport,
  ImportSource,
  ImportSummary,
  ImportWarning,
  NormalizedIssue,
  ResolvedUserReport,
  RowIssue,
  UnmappedValue,
} from "./types";
