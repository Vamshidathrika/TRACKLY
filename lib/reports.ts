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
    orderBy: { createdAt: "desc" },
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

export function formatReportCSV(type: "burndown" | "velocity" | "cumulative", data: any): string {
  if (type === "burndown") {
    const header = "Day,Ideal Story Points,Actual Remaining Points\n";
    const rows = (data.timeline || []).map((t: any) => `${t.day},${t.ideal},${t.actual}`).join("\n");
    return header + rows;
  }

  if (type === "velocity") {
    const header = "Sprint Name,Committed Points,Completed Points\n";
    const rows = (data || []).map((v: any) => `"${v.name}",${v.committed},${v.completed}`).join("\n");
    return header + rows;
  }

  if (type === "cumulative") {
    const header = "Status,Task Count\n";
    const rows = (data || []).map((c: any) => `${c.status},${c.count}`).join("\n");
    return header + rows;
  }

  return "";
}
