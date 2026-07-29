/**
 * `GET /api/v1/projects/:key` — fetch one project by key or id (`projects:read`).
 */
import { withApi } from "@/lib/api/handler";
import { requireScope } from "@/lib/api/auth";
import { jsonOk } from "@/lib/api/response";
import { parseOrThrow } from "@/lib/api/handler";
import { resolveProjectByKeyOrId } from "@/lib/api/access";
import { projectKeyParamSchema } from "@/lib/api/schemas";
import { serialiseProject } from "@/lib/api/serializers";
import { prisma } from "@/lib/prisma";

type Params = { key: string };

export const GET = withApi<Params>(async ({ ctx, params }) => {
  requireScope(ctx, "projects:read");
  const keyOrId = parseOrThrow(projectKeyParamSchema, params.key);

  const { id } = await resolveProjectByKeyOrId(ctx, keyOrId);
  const project = await prisma.project.findUniqueOrThrow({
    where: { id },
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
  });

  return jsonOk(serialiseProject(project), { requestId: ctx.requestId });
});
