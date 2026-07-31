/**
 * `GET /api/v1/issues`  — list issues in the token's workspace (`issues:read`).
 * `POST /api/v1/issues` — create an issue in a project the token can write to (`issues:write`).
 *
 * Tenant scoping: list results are constrained by `issueWhere(scope)`
 * (lib/api/access.ts) — a SQL-level filter, applied unconditionally, before
 * any caller-supplied filter is added. Creation resolves the target project
 * through `resolveProjectByKeyOrId`, which 404s (not 403) for a project id
 * that is real but lives in another workspace.
 */
import { withApi, readJsonBody, parseOrThrow, searchParamsToObject } from "@/lib/api/handler";
import { requireScope } from "@/lib/api/auth";
import { jsonList, jsonOk } from "@/lib/api/response";
import { apiError } from "@/lib/api/errors";
import {
  assertParentInProject,
  assertSprintInProject,
  assertWorkspaceUser,
  assertProjectMember,
  issueWhere,
  resolveProjectByKeyOrId,
  resolveProjectScope,
  scopeIsEmpty,
} from "@/lib/api/access";
import { buildPage, cursorOrderBy, cursorWhere, decodeCursor, parseLimit } from "@/lib/api/pagination";
import { createIssueSchema, listIssuesQuerySchema } from "@/lib/api/schemas";
import { ISSUE_SELECT, serialiseIssue } from "@/lib/api/serializers";
import { triggerWebhookEvent } from "@/lib/api/webhooks/dispatch";
import { createIssue } from "@/lib/issues";
import { prisma } from "@/lib/prisma";

export const GET = withApi(async ({ req, ctx }) => {
  requireScope(ctx, "issues:read");

  const url = new URL(req.url);
  const query = parseOrThrow(listIssuesQuerySchema, searchParamsToObject(req.url));
  const limit = parseLimit(url.searchParams.get("limit"));
  const cursor = decodeCursor(url.searchParams.get("cursor"));
  const direction = query.order ?? "desc";

  const scope = await resolveProjectScope(ctx);

  // A filter naming a specific project is validated (and 404s for a project
  // in another workspace) BEFORE it narrows the query — an unvalidated
  // projectId here would let a caller confirm the existence of, and iterate
  // the issues of, a project outside their scope.
  let projectFilter: Record<string, unknown> = issueWhere(scope);
  if (query.project) {
    const { id: projectId } = await resolveProjectByKeyOrId(ctx, query.project);
    projectFilter = scope.kind === "site" ? { projectId } : { projectId, project: { siteId: scope.siteId } };
  } else if (scopeIsEmpty(scope)) {
    return jsonList([], { requestId: ctx.requestId, limit, nextCursor: null });
  }

  const where: Record<string, unknown> = {
    AND: [
      projectFilter,
      cursorWhere(cursor, "createdAt", direction),
      query.status ? { status: query.status } : {},
      query.type ? { type: query.type } : {},
      query.priority ? { priority: query.priority } : {},
      query.assigneeId ? { assigneeId: query.assigneeId } : {},
      query.reporterId ? { reporterId: query.reporterId } : {},
      query.sprintId ? { sprintId: query.sprintId } : {},
      query.label ? { labels: { has: query.label } } : {},
      query.q ? { summary: { contains: query.q, mode: "insensitive" } } : {},
      query.updatedSince ? { updatedAt: { gte: query.updatedSince } } : {},
    ],
  };

  const rows = await prisma.issue.findMany({
    where,
    select: ISSUE_SELECT,
    orderBy: cursorOrderBy("createdAt", direction),
    take: limit + 1,
  });

  const { items, nextCursor } = buildPage(rows, limit, (r) => r.createdAt);
  return jsonList(items.map(serialiseIssue), { requestId: ctx.requestId, limit, nextCursor });
});

export const POST = withApi(async ({ req, ctx }) => {
  requireScope(ctx, "issues:write");

  const body = parseOrThrow(createIssueSchema, await readJsonBody(req));
  const { id: projectId, access } = await resolveProjectByKeyOrId(ctx, body.project);
  if (!access.canWrite) {
    throw apiError.forbidden("Your role on this project is read-only.");
  }

  if (body.assigneeId) await assertProjectMember(ctx, projectId, body.assigneeId, "assigneeId");
  if (body.parentId) await assertParentInProject(body.parentId, projectId, "parentId");
  if (body.sprintId) await assertSprintInProject(body.sprintId, projectId, "sprintId");

  const created = await createIssue({
    projectId,
    summary: body.summary,
    description: body.description ?? undefined,
    type: body.type,
    status: body.status,
    priority: body.priority,
    storyPoints: body.storyPoints ?? undefined,
    originalEstimate: body.originalEstimate ?? undefined,
    reporterId: ctx.userId,
    assigneeId: body.assigneeId ?? undefined,
    parentId: body.parentId ?? undefined,
    sprintId: body.sprintId ?? undefined,
    dueDate: body.dueDate ?? undefined,
    labels: body.labels,
  });

  const issue = await prisma.issue.findUniqueOrThrow({ where: { id: created.id }, select: ISSUE_SELECT });
  const serialised = serialiseIssue(issue);

  triggerWebhookEvent(ctx.siteId, "issue.created", { event: "issue.created", issue: serialised });

  return jsonOk(serialised, { requestId: ctx.requestId, status: 201 });
});
