/**
 * `GET /api/v1/projects/:key/sprints`  — list sprints in a project (`sprints:read`).
 * `POST /api/v1/projects/:key/sprints` — create a sprint (`sprints:write`).
 */
import { withApi, readJsonBody, parseOrThrow } from "@/lib/api/handler";
import { requireScope } from "@/lib/api/auth";
import { jsonList, jsonOk } from "@/lib/api/response";
import { apiError } from "@/lib/api/errors";
import { resolveProjectByKeyOrId } from "@/lib/api/access";
import { buildPage, cursorOrderBy, cursorWhere, decodeCursor, parseLimit } from "@/lib/api/pagination";
import { createSprintSchema, projectKeyParamSchema } from "@/lib/api/schemas";
import { SPRINT_SELECT, serialiseSprint } from "@/lib/api/serializers";
import { createSprint } from "@/lib/sprints";
import { prisma } from "@/lib/prisma";

type Params = { key: string };

export const GET = withApi<Params>(async ({ req, ctx, params }) => {
  requireScope(ctx, "sprints:read");
  const keyOrId = parseOrThrow(projectKeyParamSchema, params.key);
  const { id: projectId } = await resolveProjectByKeyOrId(ctx, keyOrId);

  const url = new URL(req.url);
  const limit = parseLimit(url.searchParams.get("limit"));
  const cursor = decodeCursor(url.searchParams.get("cursor"));

  const rows = await prisma.sprint.findMany({
    where: { projectId, ...cursorWhere(cursor, "createdAt", "desc") },
    select: SPRINT_SELECT,
    orderBy: cursorOrderBy("createdAt", "desc"),
    take: limit + 1,
  });

  const { items, nextCursor } = buildPage(rows, limit, (r) => r.createdAt);
  return jsonList(items.map(serialiseSprint), { requestId: ctx.requestId, limit, nextCursor });
});

export const POST = withApi<Params>(async ({ req, ctx, params }) => {
  requireScope(ctx, "sprints:write");
  const keyOrId = parseOrThrow(projectKeyParamSchema, params.key);
  const { id: projectId, access } = await resolveProjectByKeyOrId(ctx, keyOrId);
  if (!access.canWrite) {
    throw apiError.forbidden("Your role on this project is read-only.");
  }

  const body = parseOrThrow(createSprintSchema, await readJsonBody(req));
  const created = await createSprint({
    projectId,
    name: body.name,
    goal: body.goal ?? undefined,
    startDate: body.startDate,
    endDate: body.endDate,
  });

  const sprint = await prisma.sprint.findUniqueOrThrow({ where: { id: created.id }, select: SPRINT_SELECT });
  return jsonOk(serialiseSprint(sprint), { requestId: ctx.requestId, status: 201 });
});
