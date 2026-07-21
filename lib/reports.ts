import { prisma } from "./prisma";

export async function getBurndownData(sprintId: string) {
  const sprint = await prisma.sprint.findUnique({
    where: { id: sprintId },
    include: { issues: true },
  });

  if (!sprint) {
    return { sprintName: "Sprint", totalPoints: 0, pointsDone: 0, pointsRemaining: 0, timeline: [] };
  }

  const totalPoints = sprint.issues.reduce((sum, i) => sum + (i.storyPoints ?? 1), 0);
  const pointsDone = sprint.issues
    .filter((i) => i.status === "DONE")
    .reduce((sum, i) => sum + (i.storyPoints ?? 1), 0);
  const pointsRemaining = totalPoints - pointsDone;

  // Build 10-day timeline data points for chart
  const timeline = Array.from({ length: 10 }, (_, idx) => {
    const day = `Day ${idx + 1}`;
    const ideal = Math.max(0, Math.round(totalPoints - (totalPoints / 9) * idx));
    const actual = idx >= 5 ? pointsRemaining : Math.max(pointsRemaining, totalPoints - idx * 2);
    return { day, ideal, actual };
  });

  return {
    sprintName: sprint.name,
    totalPoints,
    pointsDone,
    pointsRemaining,
    timeline,
  };
}

export async function getVelocityData(projectId: string) {
  const sprints = await prisma.sprint.findMany({
    where: { projectId },
    include: { issues: true },
    orderBy: { createdAt: "asc" },
    take: 5,
  });

  return sprints.map((s) => {
    const committed = s.issues.reduce((sum, i) => sum + (i.storyPoints ?? 1), 0);
    const completed = s.issues
      .filter((i) => i.status === "DONE")
      .reduce((sum, i) => sum + (i.storyPoints ?? 1), 0);
    return {
      name: s.name,
      committed,
      completed,
    };
  });
}

export async function getProjectMetrics(projectId: string) {
  const issues = await prisma.issue.findMany({
    where: { projectId },
    select: { status: true, priority: true },
  });

  const statusCounts: Record<string, number> = {
    TO_DO: 0,
    IN_PROGRESS: 0,
    IN_REVIEW: 0,
    DONE: 0,
  };

  const priorityCounts: Record<string, number> = {
    HIGHEST: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    LOWEST: 0,
  };

  for (const issue of issues) {
    statusCounts[issue.status] = (statusCounts[issue.status] || 0) + 1;
    priorityCounts[issue.priority] = (priorityCounts[issue.priority] || 0) + 1;
  }

  return {
    totalIssues: issues.length,
    statusCounts,
    priorityCounts,
  };
}
