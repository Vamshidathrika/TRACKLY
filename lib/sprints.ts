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

export async function startSprint(
  sprintId: string,
  options?: { startDate?: Date; endDate?: Date; goal?: string }
) {
  return prisma.sprint.update({
    where: { id: sprintId },
    data: {
      status: "ACTIVE",
      startDate: options?.startDate ?? new Date(),
      endDate: options?.endDate ?? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // Default 2 weeks
      goal: options?.goal,
    },
  });
}

export async function completeSprint(sprintId: string) {
  const sprint = await prisma.sprint.update({
    where: { id: sprintId },
    data: { status: "CLOSED" },
  });

  // Move remaining un-DONE issues in closed sprint back to backlog (null sprintId)
  await prisma.issue.updateMany({
    where: {
      sprintId,
      status: { not: "DONE" },
    },
    data: { sprintId: null },
  });

  return sprint;
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
