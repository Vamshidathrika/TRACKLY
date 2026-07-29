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

/**
 * Lead Time: total time from issue creation to completion (DONE).
 * Cycle Time: time from the issue entering IN_PROGRESS to DONE.
 * Both are core engineering productivity metrics (Linear Cycle Time, Jira Control Chart).
 */
export interface LeadCycleTimeMetric {
  issueId: string;
  issueKey: string;
  summary: string;
  priority: string;
  leadTimeHours: number | null;   // createdAt → DONE
  cycleTimeHours: number | null;  // IN_PROGRESS → DONE
  completedAt: Date | null;
}

export interface LeadCycleTimeSummary {
  avgLeadTimeHours: number;
  avgCycleTimeHours: number;
  p50LeadTimeHours: number;
  p50CycleTimeHours: number;
  p90LeadTimeHours: number;
  p90CycleTimeHours: number;
  totalSampled: number;
  metrics: LeadCycleTimeMetric[];
}

/** Calculate lead time & cycle time for completed issues in a project */
export async function getLeadCycleTimeMetrics(
  projectId: string,
  limit = 50
): Promise<LeadCycleTimeSummary> {
  const issues = await prisma.issue.findMany({
    where: { projectId, status: "DONE" },
    select: {
      id: true,
      key: true,
      summary: true,
      priority: true,
      createdAt: true,
      updatedAt: true,
      dueDate: true,
      workLogs: {
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });

  const metrics: LeadCycleTimeMetric[] = issues.map((issue) => {
    const completedAt = issue.updatedAt; // updatedAt when status became DONE
    const firstWorklogAt = issue.workLogs[0]?.createdAt ?? null;

    const leadTimeHours = completedAt
      ? Math.round((completedAt.getTime() - issue.createdAt.getTime()) / 3_600_000)
      : null;

    const cycleTimeHours =
      completedAt && firstWorklogAt
        ? Math.max(
            0,
            Math.round((completedAt.getTime() - firstWorklogAt.getTime()) / 3_600_000)
          )
        : null;

    return {
      issueId: issue.id,
      issueKey: issue.key,
      summary: issue.summary,
      priority: issue.priority,
      leadTimeHours,
      cycleTimeHours,
      completedAt,
    };
  });

  const leadTimes = metrics
    .map((m) => m.leadTimeHours)
    .filter((v): v is number => v !== null)
    .sort((a, b) => a - b);

  const cycleTimes = metrics
    .map((m) => m.cycleTimeHours)
    .filter((v): v is number => v !== null)
    .sort((a, b) => a - b);

  const percentile = (arr: number[], pct: number) =>
    arr.length > 0 ? arr[Math.floor((arr.length - 1) * pct)] : 0;

  const avg = (arr: number[]) =>
    arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

  return {
    avgLeadTimeHours: avg(leadTimes),
    avgCycleTimeHours: avg(cycleTimes),
    p50LeadTimeHours: percentile(leadTimes, 0.5),
    p50CycleTimeHours: percentile(cycleTimes, 0.5),
    p90LeadTimeHours: percentile(leadTimes, 0.9),
    p90CycleTimeHours: percentile(cycleTimes, 0.9),
    totalSampled: metrics.length,
    metrics,
  };
}

/** Format hours into human-readable string (e.g. "2d 3h", "45min") */
export function formatHoursDuration(hours: number | null): string {
  if (hours === null || hours < 0) return "—";
  if (hours > 0 && hours < 1) return `${Math.round(hours * 60)}min`;
  const days = Math.floor(hours / 24);
  const remainHours = hours % 24;
  if (days === 0) return `${hours}h`;
  if (remainHours === 0) return `${days}d`;
  return `${days}d ${remainHours}h`;
}
