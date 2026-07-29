/**
 * `GET /api/v1/issues/:key/comments`  — list comments on an issue (`comments:read`).
 * `POST /api/v1/issues/:key/comments` — add a comment (`comments:write`).
 */
import { withApi, readJsonBody, parseOrThrow } from "@/lib/api/handler";
import { requireScope } from "@/lib/api/auth";
import { jsonList, jsonOk } from "@/lib/api/response";
import { apiError } from "@/lib/api/errors";
import { resolveIssueByKey } from "@/lib/api/access";
import { buildPage, cursorOrderBy, cursorWhere, decodeCursor, parseLimit } from "@/lib/api/pagination";
import { createCommentSchema, issueKeyParamSchema } from "@/lib/api/schemas";
import { COMMENT_SELECT, ISSUE_SELECT, serialiseComment, serialiseIssue } from "@/lib/api/serializers";
import { triggerWebhookEvent } from "@/lib/api/webhooks/dispatch";
import { addComment } from "@/lib/issues";
import { prisma } from "@/lib/prisma";

type Params = { key: string };

export const GET = withApi<Params>(async ({ req, ctx, params }) => {
  requireScope(ctx, "comments:read");
  const key = parseOrThrow(issueKeyParamSchema, params.key);
  const { id: issueId } = await resolveIssueByKey(ctx, key);

  const url = new URL(req.url);
  const limit = parseLimit(url.searchParams.get("limit"));
  const cursor = decodeCursor(url.searchParams.get("cursor"));

  const rows = await prisma.comment.findMany({
    where: { issueId, ...cursorWhere(cursor, "createdAt", "asc") },
    select: COMMENT_SELECT,
    orderBy: cursorOrderBy("createdAt", "asc"),
    take: limit + 1,
  });

  const { items, nextCursor } = buildPage(rows, limit, (r) => r.createdAt);
  return jsonList(items.map(serialiseComment), { requestId: ctx.requestId, limit, nextCursor });
});

export const POST = withApi<Params>(async ({ req, ctx, params }) => {
  requireScope(ctx, "comments:write");
  const key = parseOrThrow(issueKeyParamSchema, params.key);

  const { id: issueId, access } = await resolveIssueByKey(ctx, key);
  if (!access.canWrite) {
    throw apiError.forbidden("Your role on this project is read-only.");
  }

  const body = parseOrThrow(createCommentSchema, await readJsonBody(req));
  const created = await addComment({ issueId, authorId: ctx.userId, body: body.body });

  const [comment, issue] = await Promise.all([
    prisma.comment.findUniqueOrThrow({ where: { id: created.id }, select: COMMENT_SELECT }),
    prisma.issue.findUniqueOrThrow({ where: { id: issueId }, select: ISSUE_SELECT }),
  ]);
  const serialisedComment = serialiseComment(comment);

  triggerWebhookEvent(ctx.siteId, "issue.commented", {
    event: "issue.commented",
    issue: serialiseIssue(issue),
    comment: serialisedComment,
  });

  return jsonOk(serialisedComment, { requestId: ctx.requestId, status: 201 });
});
