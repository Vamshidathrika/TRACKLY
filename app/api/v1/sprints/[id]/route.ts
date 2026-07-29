/**
 * `GET /api/v1/sprints/:id`   — fetch one sprint (`sprints:read`).
 * `PATCH /api/v1/sprints/:id` — update a sprint, including status transitions (`sprints:write`).
 *
 * `status` is handled separately from the other fields: `lib/sprints.ts`
 * enforces "at most one ACTIVE sprint per project" and moves unfinished
 * issues back to the backlog on close, and both of those live only in
 * `startSprint` / `completeSprint` — writing `status` straight onto the
 * Sprint row (as the other fields are) would silently skip both.
 */
import { withApi, readJsonBody, parseOrThrow } from "@/lib/api/handler";
import { requireScope } from "@/lib/api/auth";
import { jsonOk } from "@/lib/api/response";
import { apiError } from "@/lib/api/errors";
import { resolveSprintById } from "@/lib/api/access";
import { idParamSchema, updateSprintSchema } from "@/lib/api/schemas";
import { SPRINT_SELECT, serialiseSprint } from "@/lib/api/serializers";
import { completeSprint, startSprint, updateSprint } from "@/lib/sprints";
import { prisma } from "@/lib/prisma";

type Params = { id: string };

export const GET = withApi<Params>(async ({ ctx, params }) => {
  requireScope(ctx, "sprints:read");
  const id = parseOrThrow(idParamSchema, params.id);

  const { id: sprintId } = await resolveSprintById(ctx, id);
  const sprint = await prisma.sprint.findUniqueOrThrow({ where: { id: sprintId }, select: SPRINT_SELECT });

  return jsonOk(serialiseSprint(sprint), { requestId: ctx.requestId });
});

export const PATCH = withApi<Params>(async ({ req, ctx, params }) => {
  requireScope(ctx, "sprints:write");
  const id = parseOrThrow(idParamSchema, params.id);

  const { id: sprintId, access } = await resolveSprintById(ctx, id);
  if (!access.canWrite) {
    throw apiError.forbidden("Your role on this project is read-only.");
  }

  const body = parseOrThrow(updateSprintSchema, await readJsonBody(req));
  const current = await prisma.sprint.findUniqueOrThrow({ where: { id: sprintId }, select: { status: true } });

  if (body.status && body.status !== current.status) {
    if (body.status === "ACTIVE") {
      try {
        await startSprint(sprintId, { startDate: body.startDate, endDate: body.endDate, goal: body.goal ?? undefined });
      } catch (err) {
        // `startSprint` throws a plain Error naming the sprint that is
        // already active — dynamic text, so it cannot go through
        // lib/api/errors.ts's static SENTINEL_MAP. The message itself
        // describes the caller's conflicting request, not internals, so it
        // is safe to surface as-is.
        throw apiError.conflict(err instanceof Error ? err.message : "Could not start this sprint.");
      }
    } else if (body.status === "CLOSED") {
      await completeSprint(sprintId);
    } else {
      throw apiError.invalidRequest("A sprint cannot be moved back to FUTURE once started.", [
        { field: "status", message: "Only ACTIVE or CLOSED are valid transitions here." },
      ]);
    }
  }

  const remainingFields = {
    name: body.name,
    goal: body.goal ?? undefined,
    startDate: body.startDate,
    endDate: body.endDate,
  };
  if (Object.values(remainingFields).some((v) => v !== undefined)) {
    await updateSprint(sprintId, remainingFields);
  }

  const sprint = await prisma.sprint.findUniqueOrThrow({ where: { id: sprintId }, select: SPRINT_SELECT });
  return jsonOk(serialiseSprint(sprint), { requestId: ctx.requestId });
});
