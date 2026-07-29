/**
 * `GET /api/v1/issues/:key/worklogs`  — list work logs on an issue (`worklogs:read`).
 * `POST /api/v1/issues/:key/worklogs` — log work against an issue (`worklogs:write`).
 *
 * There is no `createWorkLog` helper in `lib/*` to reuse — the app's own
 * `logWorkAction` (app/(app)/issues/actions.ts) inlines the same single
 * `prisma.workLog.create` call this route makes, because there is no
 * business logic beyond the insert itself (unlike issues/comments, which
 * carry history-tracking and permission side effects worth centralising).
 */
import { withApi, readJsonBody, parseOrThrow } from "@/lib/api/handler";
import { requireScope } from "@/lib/api/auth";
import { jsonList, jsonOk } from "@/lib/api/response";
import { apiError } from "@/lib/api/errors";
import { resolveIssueByKey } from "@/lib/api/access";
import { buildPage, cursorOrderBy, cursorWhere, decodeCursor, parseLimit } from "@/lib/api/pagination";
import { createWorkLogSchema, issueKeyParamSchema } from "@/lib/api/schemas";
import { WORKLOG_SELECT, serialiseWorkLog } from "@/lib/api/serializers";
import { prisma } from "@/lib/prisma";

type Params = { key: string };

export const GET = withApi<Params>(async ({ req, ctx, params }) => {
  requireScope(ctx, "worklogs:read");
  const key = parseOrThrow(issueKeyParamSchema, params.key);
  const { id: issueId } = await resolveIssueByKey(ctx, key);

  const url = new URL(req.url);
  const limit = parseLimit(url.searchParams.get("limit"));
  const cursor = decodeCursor(url.searchParams.get("cursor"));

  const rows = await prisma.workLog.findMany({
    where: { issueId, ...cursorWhere(cursor, "startedAt", "desc") },
    select: WORKLOG_SELECT,
    orderBy: cursorOrderBy("startedAt", "desc"),
    take: limit + 1,
  });

  const { items, nextCursor } = buildPage(rows, limit, (r) => r.startedAt);
  return jsonList(items.map(serialiseWorkLog), { requestId: ctx.requestId, limit, nextCursor });
});

export const POST = withApi<Params>(async ({ req, ctx, params }) => {
  requireScope(ctx, "worklogs:write");
  const key = parseOrThrow(issueKeyParamSchema, params.key);

  const { id: issueId, access } = await resolveIssueByKey(ctx, key);
  if (!access.canWrite) {
    throw apiError.forbidden("Your role on this project is read-only.");
  }

  const body = parseOrThrow(createWorkLogSchema, await readJsonBody(req));

  const created = await prisma.workLog.create({
    data: {
      issueId,
      authorId: ctx.userId,
      hours: body.hours,
      description: body.description ?? undefined,
      startedAt: body.startedAt ?? new Date(),
    },
    select: WORKLOG_SELECT,
  });

  return jsonOk(serialiseWorkLog(created), { requestId: ctx.requestId, status: 201 });
});
