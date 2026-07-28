import { prisma } from "./prisma";

export async function createSprint(input: {
  projectId: string;
  name: string;
  goal?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  return prisma.sprint.create({
    data: {
      projectId: input.projectId,
      name: input.name,
      goal: input.goal,
      startDate: input.startDate,
      endDate: input.endDate,
      status: "FUTURE",
    },
  });
}

export async function updateSprint(
  sprintId: string,
  data: { name?: string; goal?: string; startDate?: Date; endDate?: Date }
) {
  return prisma.sprint.update({
    where: { id: sprintId },
    data,
  });
}

export async function startSprint(
  sprintId: string,
  options?: { startDate?: Date; endDate?: Date; goal?: string }
) {
  const sprint = await prisma.sprint.findUnique({ where: { id: sprintId } });
  if (!sprint) {
    throw new Error("Sprint not found");
  }

  // Only one sprint may be ACTIVE per project at a time — starting a second while
  // one is already running would leave the first's issues silently tracked under
  // no active sprint (the board only ever surfaces one "current" sprint).
  const otherActiveSprint = await prisma.sprint.findFirst({
    where: { projectId: sprint.projectId, status: "ACTIVE", id: { not: sprintId } },
  });
  if (otherActiveSprint) {
    throw new Error(`Sprint "${otherActiveSprint.name}" is already active. Complete it before starting another.`);
  }

  return prisma.sprint.update({
    where: { id: sprintId },
    data: {
      status: "ACTIVE",
      // Preserve dates entered at sprint creation — this previously always
      // overwrote startDate/endDate with now/+14d on start, silently destroying
      // whatever the user had planned when creating the sprint.
      startDate: options?.startDate ?? sprint.startDate ?? new Date(),
      endDate: options?.endDate ?? sprint.endDate ?? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // Default 2 weeks
      goal: options?.goal,
    },
  });
}

export async function completeSprint(sprintId: string) {
  // Both writes must land together — without a transaction, a crash between
  // closing the sprint and detaching its issues could leave the sprint CLOSED
  // while its incomplete issues stay pinned to a sprint nothing shows anymore.
  return prisma.$transaction(async (tx) => {
    const sprint = await tx.sprint.update({
      where: { id: sprintId },
      data: { status: "CLOSED" },
    });

    // Move remaining un-DONE issues in closed sprint back to backlog (null sprintId)
    await tx.issue.updateMany({
      where: {
        sprintId,
        status: { not: "DONE" },
      },
      data: { sprintId: null },
    });

    return sprint;
  });
}

export async function getSprintsByProject(projectId: string) {
  return prisma.sprint.findMany({
    where: { projectId },
    include: {
      issues: {
        include: {
          assignee: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: { rank: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function moveIssueToSprint(issueId: string, sprintId: string | null) {
  return prisma.issue.update({
    where: { id: issueId },
    data: { sprintId },
  });
}
