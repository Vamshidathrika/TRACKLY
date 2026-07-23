import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/tenant";
import { Breadcrumbs } from "@/components/nav/Breadcrumbs";
import { DashboardView } from "@/components/dashboards/DashboardView";
import { CreateIssueModal } from "@/components/issues/CreateIssueModal";
import { Button } from "@/components/ui/Button";
import { ShieldCheck, Activity, Terminal } from "lucide-react";

export default async function DashboardsPage() {
  const { userId, siteId } = await requireMembership();

  // 1. Fetch all projects in site
  const projects = await prisma.project.findMany({
    where: { siteId },
    include: {
      sprints: {
        orderBy: { createdAt: "desc" },
      },
      issues: {
        include: {
          assignee: { select: { id: true, name: true, avatarUrl: true } },
          reporter: { select: { id: true, name: true, avatarUrl: true } },
        },
      },
    },
  });

  // 2. Aggregate all workspace issues
  const allIssues = projects.flatMap((p) =>
    p.issues.map((i) => ({ ...i, projectKey: p.key, projectName: p.name }))
  );

  // Status Counts
  const statusCounts: Record<string, number> = {
    TO_DO: 0,
    IN_PROGRESS: 0,
    IN_REVIEW: 0,
    DONE: 0,
  };
  allIssues.forEach((i) => {
    statusCounts[i.status] = (statusCounts[i.status] ?? 0) + 1;
  });

  // Priority Counts
  const priorityCounts: Record<string, number> = {
    HIGHEST: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    LOWEST: 0,
  };
  allIssues.forEach((i) => {
    priorityCounts[i.priority] = (priorityCounts[i.priority] ?? 0) + 1;
  });

  // Type Counts
  const typeCounts: Record<string, number> = {
    STORY: 0,
    TASK: 0,
    BUG: 0,
    EPIC: 0,
    SUBTASK: 0,
  };
  allIssues.forEach((i) => {
    typeCounts[i.type] = (typeCounts[i.type] ?? 0) + 1;
  });

  // Teammate Workload
  const memberWorkloadMap = new Map<string, { id: string; name: string; avatarUrl?: string | null; count: number; points: number }>();
  allIssues.forEach((i) => {
    if (i.assignee) {
      const existing = memberWorkloadMap.get(i.assignee.id) ?? {
        id: i.assignee.id,
        name: i.assignee.name,
        avatarUrl: i.assignee.avatarUrl,
        count: 0,
        points: 0,
      };
      existing.count += 1;
      existing.points += i.storyPoints ?? 1;
      memberWorkloadMap.set(i.assignee.id, existing);
    }
  });
  const memberWorkloads = Array.from(memberWorkloadMap.values());

  // 3. User's Assigned Tasks
  const assignedIssues = allIssues
    .filter((i) => i.assigneeId === userId)
    .slice(0, 6)
    .map((i) => ({
      id: i.id,
      key: i.key,
      summary: i.summary,
      type: i.type,
      status: i.status,
      priority: i.priority,
      project: { key: i.projectKey },
    }));

  // 4. Live Activity History
  const recentActivity = siteId
    ? await prisma.issueHistory.findMany({
        where: { issue: { project: { siteId } } },
        include: {
          author: { select: { name: true } },
          issue: { select: { key: true, project: { select: { key: true } } } },
        },
        take: 8,
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <div className="flex flex-1 flex-col px-8 py-7 overflow-y-auto">
      <Breadcrumbs
        items={[{ label: "Workspace", href: "/your-work" }, { label: "Military Command Center Dashboard" }]}
      />

      {/* Military Grade Command Header */}
      <div className="mt-4 mb-6 flex items-start justify-between flex-wrap gap-4 border-b border-border-default pb-5">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-success"></span>
            </span>
            <span className="text-[11px] font-mono font-bold tracking-widest text-success uppercase">
              OPERATIONAL READY • DEFCON 5 NORMAL
            </span>
          </div>

          <h1 className="text-[26px] font-bold text-default tracking-tight leading-tight mt-1 flex items-center gap-2">
            <Terminal size={24} className="text-brand" />
            Military Grade Command Center
          </h1>
          <p className="text-[13px] text-subtle mt-0.5">
            Real-time tactical telemetry, sprint velocity spectrum, workload capacity, & threat indices.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:flex flex-col text-right font-mono text-[11px] text-subtlest border-r border-border-default pr-4 mr-2">
            <span>SYS TIME: {new Date().toISOString().slice(11, 19)} UTC</span>
            <span>STATUS: 100% OPERATIONAL</span>
          </div>
          <CreateIssueModal
            trigger={
              <Button appearance="primary" className="shrink-0 flex items-center gap-1.5">
                + Deploy Task
              </Button>
            }
          />
        </div>
      </div>

      <DashboardView
        statusCounts={statusCounts}
        priorityCounts={priorityCounts}
        typeCounts={typeCounts}
        assignedIssues={assignedIssues}
        recentActivity={recentActivity}
        memberWorkloads={memberWorkloads}
        projects={projects.map((p) => ({
          id: p.id,
          name: p.name,
          key: p.key,
          totalIssues: p.issues.length,
          doneIssues: p.issues.filter((i) => i.status === "DONE").length,
          activeSprint: p.sprints.find((s) => s.status === "ACTIVE")?.name ?? "No Active Sprint",
        }))}
      />
    </div>
  );
}
