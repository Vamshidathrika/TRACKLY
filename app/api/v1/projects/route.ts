/**
 * `GET /api/v1/projects` — list projects visible to the token (`projects:read`).
 *
 * There is deliberately no `POST` here. Project creation touches workspace-
 * wide state (key allocation, starter-issue seeding, default membership) that
 * the app's own `createProject` already owns end to end; the public API's
 * scope set (lib/api/scopes.ts) has no `projects:write`, so exposing creation
 * would be either unenforceable (no scope to gate it) or need a new scope
 * decided with product input on how the API surface should grow. Read-only
 * for now, matching what the API can honestly guarantee.
 */
import { withApi } from "@/lib/api/handler";
import { requireScope } from "@/lib/api/auth";
import { jsonList } from "@/lib/api/response";
import { projectWhere, resolveProjectScope, scopeIsEmpty } from "@/lib/api/access";
import { buildPage, cursorOrderBy, cursorWhere, decodeCursor, parseLimit } from "@/lib/api/pagination";
import { serialiseProject } from "@/lib/api/serializers";
import type { ProjectRow } from "@/lib/api/serializers";
import { prisma } from "@/lib/prisma";

export const GET = withApi(async ({ req, ctx }) => {
  requireScope(ctx, "projects:read");

  const url = new URL(req.url);
  const limit = parseLimit(url.searchParams.get("limit"));
  const cursor = decodeCursor(url.searchParams.get("cursor"));

  const scope = await resolveProjectScope(ctx);
  if (scopeIsEmpty(scope)) {
    return jsonList([], { requestId: ctx.requestId, limit, nextCursor: null });
  }

  const rows = (await prisma.project.findMany({
    where: { ...projectWhere(scope), ...cursorWhere(cursor, "createdAt", "desc") },
    select: {
      id: true,
      key: true,
      name: true,
      type: true,
      createdAt: true,
      updatedAt: true,
      lead: { select: { id: true, name: true, avatarUrl: true } },
      _count: { select: { issues: true } },
    },
    orderBy: cursorOrderBy("createdAt", "desc"),
    take: limit + 1,
  })) as unknown as ProjectRow[];

  const { items, nextCursor } = buildPage(rows, limit, (r) => r.createdAt);
  return jsonList(items.map(serialiseProject), { requestId: ctx.requestId, limit, nextCursor });
});
