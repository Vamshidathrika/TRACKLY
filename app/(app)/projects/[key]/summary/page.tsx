import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { Breadcrumbs } from "@/components/nav/Breadcrumbs";
import { DashboardView, type EpicProgressItem } from "@/components/dashboards/DashboardView";

export default async function ProjectSummaryPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const upperKey = key.toUpperCase();
  await getAuthUser();

  const project = await prisma.project.findFirst({
    where: { key: upperKey },
    select: { id: true, key: true, name: true, type: true, siteId: true },
  });

  if (!project) redirect("/projects");

  // Fetch issues & history for this project
  const issues = await prisma.issue.findMany({
    where: { projectId: project.id },
    include: {
      assignee: { select: { id: true, name: true, avatarUrl: true } },
      subtasks: { select: { id: true, status: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

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

  // Fetch recent history
  const historyEntries = await prisma.issueHistory.findMany({
    where: { issue: { projectId: project.id } },
    take: 8,
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { name: true } },
      issue: { select: { key: true, project: { select: { key: true } } } },
    },
  });

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
      />
    </main>
  );
}
