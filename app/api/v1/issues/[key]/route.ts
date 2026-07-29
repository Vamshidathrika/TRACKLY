/**
 * `GET /api/v1/issues/:key`   — fetch one issue (`issues:read`).
 * `PATCH /api/v1/issues/:key` — update one issue (`issues:write`).
 *
 * `:key` is a human key (`TRK-42`). `resolveIssueByKey` (lib/api/access.ts)
 * filters by `project: { siteId: ctx.siteId }` in the SQL itself, so a key
 * belonging to another workspace never comes back — this is Gate 1 from that
 * file's header comment, not merely a post-fetch check.
 */
import { withApi, readJsonBody, parseOrThrow } from "@/lib/api/handler";
import { requireScope } from "@/lib/api/auth";
import { jsonOk } from "@/lib/api/response";
import { apiError } from "@/lib/api/errors";
import { assertSprintInProject, assertWorkspaceUser, resolveIssueByKey } from "@/lib/api/access";
import { issueKeyParamSchema, updateIssueSchema } from "@/lib/api/schemas";
import { ISSUE_SELECT, serialiseIssue } from "@/lib/api/serializers";
import { triggerWebhookEvent } from "@/lib/api/webhooks/dispatch";
import { updateIssue } from "@/lib/issues";
import { prisma } from "@/lib/prisma";

type Params = { key: string };

export const GET = withApi<Params>(async ({ ctx, params }) => {
  requireScope(ctx, "issues:read");
  const key = parseOrThrow(issueKeyParamSchema, params.key);

  const { id } = await resolveIssueByKey(ctx, key);
  const issue = await prisma.issue.findUniqueOrThrow({ where: { id }, select: ISSUE_SELECT });

  return jsonOk(serialiseIssue(issue), { requestId: ctx.requestId });
});

export const PATCH = withApi<Params>(async ({ req, ctx, params }) => {
  requireScope(ctx, "issues:write");
  const key = parseOrThrow(issueKeyParamSchema, params.key);

  const { id, projectId, access } = await resolveIssueByKey(ctx, key);
  if (!access.canWrite) {
    throw apiError.forbidden("Your role on this project is read-only.");
  }

  const body = parseOrThrow(updateIssueSchema, await readJsonBody(req));

  if (body.assigneeId) await assertWorkspaceUser(ctx, body.assigneeId, "assigneeId");
  if (body.sprintId) await assertSprintInProject(body.sprintId, projectId, "sprintId");

  // updateIssue (lib/issues.ts) enforces "only the assignee or a workspace
  // admin may change status" itself and throws the sentinel Error that
  // lib/api/errors.ts maps to a 403 — this route does not duplicate that
  // check, only the tenant/write-role gate above it.
  await updateIssue(id, ctx.userId, {
    summary: body.summary,
    description: body.description ?? undefined,
    type: body.type,
    status: body.status,
    priority: body.priority,
    storyPoints: body.storyPoints,
    originalEstimate: body.originalEstimate,
    assigneeId: body.assigneeId,
    sprintId: body.sprintId,
    startDate: body.startDate,
    dueDate: body.dueDate,
    labels: body.labels,
  });

  const issue = await prisma.issue.findUniqueOrThrow({ where: { id }, select: ISSUE_SELECT });
  const serialised = serialiseIssue(issue);

  triggerWebhookEvent(ctx.siteId, "issue.updated", { event: "issue.updated", issue: serialised });

  return jsonOk(serialised, { requestId: ctx.requestId });
});
