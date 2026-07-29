/**
 * Tenant and project scoping for `/api/v1`.
 *
 * **This is the file to read if you are auditing the API for IDOR.** Every
 * public endpoint resolves its target through one of these helpers; none of
 * them accept a `siteId` from the caller, and none of them return a row that
 * has not been proven to live in `ctx.siteId`.
 *
 * Two independent gates are applied to every request, and neither is allowed to
 * be the only one:
 *
 *   Gate 1 — SQL-level scope. Reads are constrained by
 *            `projectId IN (projects this principal can see in ctx.siteId)`, or
 *            for a workspace admin by `project.siteId = ctx.siteId`. A row from
 *            another workspace is never fetched in the first place.
 *
 *   Gate 2 — post-fetch assertion. Anything resolved by a caller-supplied
 *            identifier is re-checked with `checkProjectAccess` (the same guard
 *            the web app uses, so `Role`/`ProjectRole` semantics cannot drift
 *            between UI and API) and its `siteId` is asserted equal to
 *            `ctx.siteId`.
 *
 * Gate 2 alone would be enough for single-row lookups; gate 1 alone would be
 * enough for lists. Both are applied because the failure mode of getting this
 * wrong is a silent cross-tenant read, which no test suite notices unless it is
 * specifically looking.
 */
import { prisma } from "@/lib/prisma";
import { checkProjectAccess } from "@/lib/tenant";
import type { ProjectContext } from "@/lib/tenant";
import { apiError } from "./errors";
import type { ApiContext } from "./auth";

/**
 * The set of projects a token may read.
 *
 * `site` is only ever produced for a workspace ADMIN, and even then it carries
 * the siteId so the caller cannot forget to filter.
 */
export type ProjectScope =
  | { kind: "site"; siteId: string }
  | { kind: "projects"; siteId: string; projectIds: string[] };

/**
 * Deliberately NOT `lib/projects.ts::getProjectsForUser`. That function unions
 * every workspace the user is an admin of, across all sites — correct for the
 * app's "your work" view, catastrophic for a token that is supposed to be
 * pinned to one workspace. This one is site-first.
 */
export async function resolveProjectScope(ctx: ApiContext): Promise<ProjectScope> {
  if (ctx.role === "ADMIN") {
    return { kind: "site", siteId: ctx.siteId };
  }

  const projects = await prisma.project.findMany({
    where: {
      siteId: ctx.siteId,
      OR: [{ leadId: ctx.userId }, { members: { some: { userId: ctx.userId } } }],
    },
    select: { id: true },
  });

  return { kind: "projects", siteId: ctx.siteId, projectIds: projects.map((p) => p.id) };
}

/** Prisma `where` fragment scoping a query on `Project` itself. */
export function projectWhere(scope: ProjectScope): Record<string, unknown> {
  return scope.kind === "site"
    ? { siteId: scope.siteId }
    : { siteId: scope.siteId, id: { in: scope.projectIds } };
}

/** Prisma `where` fragment scoping any model with a `projectId` + `project` relation. */
export function issueWhere(scope: ProjectScope): Record<string, unknown> {
  return scope.kind === "site"
    ? { project: { siteId: scope.siteId } }
    : { projectId: { in: scope.projectIds }, project: { siteId: scope.siteId } };
}

/** True when the scope can match nothing — lets callers short-circuit the query. */
export function scopeIsEmpty(scope: ProjectScope): boolean {
  return scope.kind === "projects" && scope.projectIds.length === 0;
}

// ─── Single-resource resolution ─────────────────────────────────────────────

export type ProjectAccess = ProjectContext & { canWrite: boolean };

/**
 * Resolves a project id the caller may read, or throws 404.
 *
 * 404 rather than 403 for "exists, but in another workspace" — a 403 would
 * confirm the id is real and turn the endpoint into a cross-tenant existence
 * oracle.
 */
export async function requireProjectAccessById(
  ctx: ApiContext,
  projectId: string
): Promise<ProjectAccess> {
  const access = await checkProjectAccess(ctx.userId, projectId);

  // The siteId assertion is the load-bearing line in this file. `checkProjectAccess`
  // answers "may this user see this project *anywhere*"; a token must additionally
  // be confined to the workspace it was issued for, even when its owner is a
  // legitimate member of both.
  if (!access || access.siteId !== ctx.siteId) {
    throw apiError.notFound("Project");
  }

  return { ...access, canWrite: access.projectRole !== "VIEWER" };
}

/** Read access plus a write-capable role. VIEWERs get 403, not 404 — they can see it. */
export async function requireProjectWriteAccess(
  ctx: ApiContext,
  projectId: string
): Promise<ProjectAccess> {
  const access = await requireProjectAccessById(ctx, projectId);
  if (!access.canWrite) {
    throw apiError.forbidden("Your role on this project is read-only.");
  }
  return access;
}

/** Project-administrator access (sprints, project configuration). */
export async function requireProjectAdminAccess(
  ctx: ApiContext,
  projectId: string
): Promise<ProjectAccess> {
  const access = await requireProjectAccessById(ctx, projectId);
  if (access.projectRole !== "ADMIN" && access.projectRole !== "WORKSPACE_ADMIN") {
    throw apiError.forbidden("This action requires project administrator access.");
  }
  return access;
}

/**
 * Resolves an issue by its human key (`TRK-42`) within the token's workspace.
 *
 * The site filter is in the query, so a key belonging to another workspace does
 * not come back at all; the project-access check then covers the "same
 * workspace, project you are not a member of" case.
 */
export async function resolveIssueByKey(
  ctx: ApiContext,
  issueKey: string
): Promise<{ id: string; projectId: string; key: string; access: ProjectAccess }> {
  const issue = await prisma.issue.findFirst({
    where: { key: issueKey.toUpperCase(), project: { siteId: ctx.siteId } },
    select: { id: true, projectId: true, key: true },
  });

  if (!issue) throw apiError.notFound("Issue");

  const access = await requireProjectAccessById(ctx, issue.projectId);
  return { ...issue, access };
}

/** Resolves a sprint id within the token's workspace. */
export async function resolveSprintById(
  ctx: ApiContext,
  sprintId: string
): Promise<{ id: string; projectId: string; access: ProjectAccess }> {
  const sprint = await prisma.sprint.findFirst({
    where: { id: sprintId, project: { siteId: ctx.siteId } },
    select: { id: true, projectId: true },
  });

  if (!sprint) throw apiError.notFound("Sprint");

  const access = await requireProjectAccessById(ctx, sprint.projectId);
  return { ...sprint, access };
}

/**
 * Resolves a project by key OR id within the token's workspace.
 *
 * Accepts an id as well as a key because integrators paste both; either way the
 * lookup is site-filtered before the access check runs.
 */
export async function resolveProjectByKeyOrId(
  ctx: ApiContext,
  keyOrId: string
): Promise<{ id: string; key: string; access: ProjectAccess }> {
  const project = await prisma.project.findFirst({
    where: {
      siteId: ctx.siteId,
      OR: [{ key: keyOrId.toUpperCase() }, { id: keyOrId }],
    },
    select: { id: true, key: true },
  });

  if (!project) throw apiError.notFound("Project");

  const access = await requireProjectAccessById(ctx, project.id);
  return { ...project, access };
}

/**
 * Validates that a user id supplied by the caller (assignee, reporter) is a
 * member of the token's workspace.
 *
 * Without this, `PATCH /issues/TRK-1 {"assigneeId": "<any cuid>"}` is a user-id
 * confirmation oracle *and* writes a foreign user into this workspace's data.
 */
export async function assertWorkspaceUser(
  ctx: ApiContext,
  userId: string,
  field: string
): Promise<void> {
  const membership = await prisma.membership.findUnique({
    where: { userId_siteId: { userId, siteId: ctx.siteId } },
    select: { id: true },
  });

  if (!membership) {
    throw apiError.invalidRequest("That user is not a member of this workspace.", [
      { field, message: "Unknown user for this workspace." },
    ]);
  }
}

/** Validates that a sprint belongs to the project the issue is in. */
export async function assertSprintInProject(
  sprintId: string,
  projectId: string,
  field: string
): Promise<void> {
  const sprint = await prisma.sprint.findFirst({
    where: { id: sprintId, projectId },
    select: { id: true },
  });

  if (!sprint) {
    throw apiError.invalidRequest("That sprint does not belong to this project.", [
      { field, message: "Unknown sprint for this project." },
    ]);
  }
}

/** Validates that a parent issue belongs to the same project. */
export async function assertParentInProject(
  parentId: string,
  projectId: string,
  field: string
): Promise<void> {
  const parent = await prisma.issue.findFirst({
    where: { id: parentId, projectId },
    select: { id: true },
  });

  if (!parent) {
    throw apiError.invalidRequest("That parent issue does not belong to this project.", [
      { field, message: "Unknown parent issue for this project." },
    ]);
  }
}
