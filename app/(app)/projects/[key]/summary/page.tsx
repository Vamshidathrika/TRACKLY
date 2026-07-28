import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireMembership, checkProjectAccess } from "@/lib/tenant";
import { resolveProjectByKey } from "@/lib/projects";
import { Breadcrumbs } from "@/components/nav/Breadcrumbs";
import { DashboardView, type EpicProgressItem } from "@/components/dashboards/DashboardView";

export default async function ProjectSummaryPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { userId, siteId } = await requireMembership();
  const { key } = await params;
  const upperKey = key.toUpperCase();

  const project = await resolveProjectByKey(userId, siteId, key);
  if (!project) redirect("/your-work");

  const access = await checkProjectAccess(userId, project.id, project.siteId);
  if (!access) redirect("/your-work");

  // Fetch issues & history concurrently
  const dayMs = 24 * 60 * 60 * 1000;
  const sevenDaysAgo = new Date(Date.now() - 6 * dayMs);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const [issues, historyEntries, activeSprints, resolvedHistory, blockingLinks] = await Promise.all([
    prisma.issue.findMany({
      where: { projectId: project.id },
      include: {
        assignee: { select: { id: true, name: true, avatarUrl: true } },
        subtasks: { select: { id: true, status: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.issueHistory.findMany({
      where: { issue: { projectId: project.id } },
      take: 8,
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { name: true } },
        issue: { select: { key: true, project: { select: { key: true } } } },
      },
    }),
    prisma.sprint.findMany({ where: { projectId: project.id, status: "ACTIVE" } }),
    prisma.issueHistory.findMany({
      where: { field: "status", newValue: "DONE", createdAt: { gte: sevenDaysAgo }, issue: { projectId: project.id } },
      select: { createdAt: true },
    }),
    prisma.issueLink.findMany({
      where: {
        relation: "BLOCKS",
        targetIssue: { projectId: project.id, status: { not: "DONE" } },
        sourceIssue: { status: { not: "DONE" } },
      },
      include: {
        sourceIssue: { select: { key: true } },
        targetIssue: { select: { id: true, key: true, summary: true } },
      },
    }),
  ]);

  // Calculate Status counts
  const statusCounts: Record<string, number> = {
    TO_DO: 0,
    IN_PROGRESS: 0,
    IN_REVIEW: 0,
    DONE: 0,
  };

  // Calculate Priority counts
  const priorityCounts: Record<string, number> = {
    HIGHEST: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    LOWEST: 0,
  };

  // Calculate Type counts
  const typeCounts: Record<string, number> = {
    TASK: 0,
    STORY: 0,
    EPIC: 0,
    BUG: 0,
    SUBTASK: 0,
  };

  const workloadMap = new Map<
    string,
    { id: string; name: string; avatarUrl?: string | null; count: number }
  >();

  let unassignedCount = 0;
  const epicItems: EpicProgressItem[] = [];

  for (const issue of issues) {
    statusCounts[issue.status] = (statusCounts[issue.status] || 0) + 1;
    priorityCounts[issue.priority] = (priorityCounts[issue.priority] || 0) + 1;
    typeCounts[issue.type] = (typeCounts[issue.type] || 0) + 1;

    if (issue.assignee) {
      const existing = workloadMap.get(issue.assignee.id);
      if (existing) {
        existing.count += 1;
      } else {
        workloadMap.set(issue.assignee.id, {
          id: issue.assignee.id,
          name: issue.assignee.name,
          avatarUrl: issue.assignee.avatarUrl,
          count: 1,
        });
      }
    } else {
      unassignedCount += 1;
    }

    if (issue.type === "EPIC") {
      epicItems.push({
        id: issue.id,
        key: issue.key,
        summary: issue.summary,
        totalChildIssues: issue.subtasks.length,
        doneChildIssues: issue.subtasks.filter((s) => s.status === "DONE").length,
      });
    }
  }

  const activeSprintIds = new Set(activeSprints.map((s) => s.id));
  const activeSprintIssues = issues.filter((i) => i.sprintId && activeSprintIds.has(i.sprintId));
  const sprintHealth = {
    sprintNames: activeSprints.map((s) => s.name),
    daysRemaining:
      activeSprints.length > 0 && activeSprints.some((s) => s.endDate)
        ? Math.ceil(
            (Math.min(...activeSprints.filter((s) => s.endDate).map((s) => new Date(s.endDate!).getTime())) - Date.now()) /
              dayMs
          )
        : null,
    totalPoints: activeSprintIssues.reduce((sum, i) => sum + (i.storyPoints ?? 0), 0),
    donePoints: activeSprintIssues.filter((i) => i.status === "DONE").reduce((sum, i) => sum + (i.storyPoints ?? 0), 0),
    inProgressPoints: activeSprintIssues
      .filter((i) => i.status === "IN_PROGRESS" || i.status === "IN_REVIEW")
      .reduce((sum, i) => sum + (i.storyPoints ?? 0), 0),
    toDoPoints: activeSprintIssues.filter((i) => i.status === "TO_DO").reduce((sum, i) => sum + (i.storyPoints ?? 0), 0),
  };

  const dayKey = (d: Date) => d.toISOString().slice(0, 10);
  const createdVsResolved = Array.from({ length: 7 }, (_, idx) => {
    const date = new Date(sevenDaysAgo.getTime() + idx * dayMs);
    const key = dayKey(date);
    return {
      label: date.toLocaleDateString("en-US", { weekday: "short" }),
      created: issues.filter((i) => dayKey(new Date(i.createdAt)) === key).length,
      resolved: resolvedHistory.filter((h) => dayKey(new Date(h.createdAt)) === key).length,
    };
  });

  const now = new Date();
  const overdueRisks = issues
    .filter((i) => i.dueDate && new Date(i.dueDate) < now && i.status !== "DONE")
    .map((i) => {
      const daysOverdue = Math.floor((now.getTime() - new Date(i.dueDate!).getTime()) / dayMs);
      return {
        id: `overdue-${i.id}`,
        severity: daysOverdue > 2 ? ("HIGH" as const) : ("MEDIUM" as const),
        issueKey: i.key,
        summary: i.summary,
        riskMessage: `Overdue by ${daysOverdue} day${daysOverdue === 1 ? "" : "s"}`,
      };
    });
  const blockedRisks = blockingLinks.map((l) => ({
    id: `blocked-${l.id}`,
    severity: "HIGH" as const,
    issueKey: l.targetIssue.key,
    summary: l.targetIssue.summary,
    riskMessage: `Blocked by ${l.sourceIssue.key}`,
  }));
  const risks = [...overdueRisks, ...blockedRisks];

  return (
    <main className="flex-1 px-8 py-6 overflow-y-auto">
      <Breadcrumbs
        items={[
          { label: "Projects", href: "/projects" },
          { label: project.name, href: `/projects/${project.key}` },
          { label: "Summary" },
        ]}
      />
      <div className="mt-2 mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text">{project.name} Summary</h1>
          <p className="text-xs text-text-subtle">
            Key: {project.key} • Realtime Telemetry Dashboard
          </p>
        </div>
      </div>

      <DashboardView
        statusCounts={statusCounts}
        priorityCounts={priorityCounts}
        typeCounts={typeCounts}
        assignedIssues={issues.slice(0, 5).map((i) => ({
          id: i.id,
          key: i.key,
          summary: i.summary,
          type: i.type,
          status: i.status,
          priority: i.priority,
          project: { key: project.key },
        }))}
        recentActivity={historyEntries}
        memberWorkloads={Array.from(workloadMap.values())}
        epics={epicItems}
        unassignedCount={unassignedCount}
        projectKey={project.key}
        sprintHealth={sprintHealth}
        createdVsResolved={createdVsResolved}
        risks={risks}
      />
    </main>
  );
}
