/**
 * Zod schemas for every byte of caller-supplied input on `/api/v1`.
 *
 * Two rules:
 *   1. `.strict()` everywhere. A permissive object schema silently accepts
 *      `{"siteId": "..."}` and hands it to a spread into `prisma.update` — mass
 *      assignment is how tenant fields get overwritten.
 *   2. Everything is bounded. Unbounded strings are a memory-amplification
 *      vector and unbounded arrays are a write amplifier (10k labels on one
 *      issue). Limits are generous but finite.
 *
 * Enum literals are duplicated from `prisma/schema.prisma` rather than imported
 * from `@prisma/client`, so a value added to the database enum does not become
 * publicly writable the moment it is generated — widening the public API stays
 * a deliberate edit to this file.
 */
import { z } from "zod";

// ─── Shared primitives ──────────────────────────────────────────────────────

/** Prisma ids are cuids; accept the character class without over-fitting the length. */
const id = z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/, "Not a valid identifier.");

const issueKey = z
  .string()
  .trim()
  .min(3)
  .max(64)
  .regex(/^[A-Za-z][A-Za-z0-9]*-[0-9]+$/, "Expected an issue key such as TRK-42.");

const projectKeyOrId = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9_-]+$/, "Not a valid project key or id.");

/** ISO-8601 in, `Date` out. Rejects "tomorrow", epoch numbers and NaN. */
const isoDate = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .refine((v) => !Number.isNaN(Date.parse(v)), "Expected an ISO-8601 timestamp.")
  .transform((v) => new Date(v));

/**
 * Path-parameter schemas. Route segments are caller-controlled too — an
 * unvalidated `[key]` reaches Prisma as a filter value, and `[id]` as a lookup.
 */
export const issueKeyParamSchema = issueKey;
export const projectKeyParamSchema = projectKeyOrId;
export const idParamSchema = id;

export const ISSUE_TYPES = ["EPIC", "STORY", "TASK", "BUG", "SUBTASK"] as const;
export const ISSUE_STATUSES = ["TO_DO", "IN_PROGRESS", "IN_REVIEW", "DONE"] as const;
export const ISSUE_PRIORITIES = ["HIGHEST", "HIGH", "MEDIUM", "LOW", "LOWEST"] as const;
export const SPRINT_STATUSES = ["FUTURE", "ACTIVE", "CLOSED"] as const;

const issueType = z.enum(ISSUE_TYPES);
const issueStatus = z.enum(ISSUE_STATUSES);
const issuePriority = z.enum(ISSUE_PRIORITIES);

const labels = z
  .array(z.string().trim().min(1).max(50))
  .max(30, "An issue may carry at most 30 labels.");

const summary = z.string().trim().min(1, "summary is required.").max(255);
const description = z.string().max(32_768).nullish();
const storyPoints = z.number().finite().min(0).max(1_000).nullish();

// ─── Issues ─────────────────────────────────────────────────────────────────

export const createIssueSchema = z
  .object({
    /** Project key (`TRK`) or project id. Required — an issue has no home otherwise. */
    project: projectKeyOrId,
    summary,
    description,
    type: issueType.optional(),
    status: issueStatus.optional(),
    priority: issuePriority.optional(),
    storyPoints,
    originalEstimate: storyPoints,
    assigneeId: id.nullish(),
    parentId: id.nullish(),
    sprintId: id.nullish(),
    startDate: isoDate.nullish(),
    dueDate: isoDate.nullish(),
    labels: labels.optional(),
  })
  .strict();

export const updateIssueSchema = z
  .object({
    summary: summary.optional(),
    description,
    type: issueType.optional(),
    status: issueStatus.optional(),
    priority: issuePriority.optional(),
    storyPoints,
    originalEstimate: storyPoints,
    assigneeId: id.nullish(),
    sprintId: id.nullish(),
    startDate: isoDate.nullish(),
    dueDate: isoDate.nullish(),
    labels: labels.optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, "Provide at least one field to update.");

/** Query parameters for `GET /v1/issues`, parsed from URLSearchParams. */
export const listIssuesQuerySchema = z
  .object({
    project: projectKeyOrId.optional(),
    status: issueStatus.optional(),
    type: issueType.optional(),
    priority: issuePriority.optional(),
    assigneeId: id.optional(),
    reporterId: id.optional(),
    sprintId: id.optional(),
    label: z.string().trim().min(1).max(50).optional(),
    /** Substring match on summary. Bounded so it cannot become a scan bomb. */
    q: z.string().trim().min(1).max(120).optional(),
    updatedSince: isoDate.optional(),
    order: z.enum(["asc", "desc"]).optional(),
  })
  .strict();

// ─── Comments ───────────────────────────────────────────────────────────────

export const createCommentSchema = z
  .object({ body: z.string().trim().min(1, "body is required.").max(32_768) })
  .strict();

// ─── Work logs ──────────────────────────────────────────────────────────────

export const createWorkLogSchema = z
  .object({
    /** Capped at a 24h day — a typo of 1000 should not corrupt a sprint report. */
    hours: z.number().finite().gt(0, "hours must be greater than zero.").max(24),
    description: z.string().trim().max(2_000).nullish(),
    startedAt: isoDate.optional(),
  })
  .strict();

// ─── Sprints ────────────────────────────────────────────────────────────────

export const createSprintSchema = z
  .object({
    name: z.string().trim().min(1, "name is required.").max(120),
    goal: z.string().trim().max(2_000).nullish(),
    startDate: isoDate.optional(),
    endDate: isoDate.optional(),
  })
  .strict()
  .refine(
    (v) => !v.startDate || !v.endDate || v.endDate >= v.startDate,
    "endDate must not be before startDate."
  );

export const updateSprintSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    goal: z.string().trim().max(2_000).nullish(),
    startDate: isoDate.optional(),
    endDate: isoDate.optional(),
    /**
     * Transitions go through `lib/sprints.ts`, which enforces "one ACTIVE sprint
     * per project" and moves unfinished issues back to the backlog on close.
     * Writing `status` straight to the column would bypass both.
     */
    status: z.enum(SPRINT_STATUSES).optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, "Provide at least one field to update.");

// ─── Webhook endpoint management (settings UI) ──────────────────────────────

export const WEBHOOK_EVENTS = ["issue.created", "issue.updated", "issue.commented"] as const;
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export const webhookEndpointSchema = z
  .object({
    url: z.string().trim().min(1, "url is required.").max(2_000),
    description: z.string().trim().max(200).nullish(),
    events: z
      .array(z.enum(WEBHOOK_EVENTS))
      .min(1, "Select at least one event.")
      .max(WEBHOOK_EVENTS.length),
  })
  .strict();

export type CreateIssueInput = z.infer<typeof createIssueSchema>;
export type UpdateIssueInput = z.infer<typeof updateIssueSchema>;
export type ListIssuesQuery = z.infer<typeof listIssuesQuerySchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type CreateWorkLogInput = z.infer<typeof createWorkLogSchema>;
export type CreateSprintInput = z.infer<typeof createSprintSchema>;
export type UpdateSprintInput = z.infer<typeof updateSprintSchema>;
export type WebhookEndpointInput = z.infer<typeof webhookEndpointSchema>;
