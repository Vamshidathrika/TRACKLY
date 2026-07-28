import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/tenant";
import { getProjectsForUser } from "@/lib/projects";
import { Breadcrumbs } from "@/components/nav/Breadcrumbs";
import { DashboardView } from "@/components/dashboards/DashboardView";
import { CreateIssueModal } from "@/components/issues/CreateIssueModal";
import { Button } from "@/components/ui/Button";
import { ShieldCheck, Activity, Terminal } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardsPage() {
  const { userId, siteId } = await requireMembership();

  // 1. Fetch authorized projects for user
  const userProjects = await getProjectsForUser(siteId, userId);
  const authorizedProjectIds = userProjects.map((p) => p.id);

  const projects = authorizedProjectIds.length > 0
    ? await prisma.project.findMany({
        where: { id: { in: authorizedProjectIds } },
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
      })
    : [];

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
  const recentActivity = authorizedProjectIds.length > 0
    ? await prisma.issueHistory.findMany({
        where: { issue: { projectId: { in: authorizedProjectIds } } },
        include: {
          author: { select: { name: true } },
          issue: { select: { key: true, project: { select: { key: true } } } },
        },
        take: 8,
        orderBy: { createdAt: "desc" },
      })
    : [];

  // 5. Active sprint health — sums story points across every currently
  // active sprint in the workspace, since the dashboard is workspace-wide.
  const activeSprints = projects.flatMap((p) => p.sprints.filter((s) => s.status === "ACTIVE"));
  const activeSprintIds = new Set(activeSprints.map((s) => s.id));
  const activeSprintIssues = allIssues.filter((i) => i.sprintId && activeSprintIds.has(i.sprintId));
  const sprintHealth = {
    sprintNames: activeSprints.map((s) => s.name),
    daysRemaining:
      activeSprints.length > 0 && activeSprints.some((s) => s.endDate)
        ? Math.ceil(
            (Math.min(...activeSprints.filter((s) => s.endDate).map((s) => new Date(s.endDate!).getTime())) - Date.now()) /
              (1000 * 60 * 60 * 24)
          )
        : null,
    totalPoints: activeSprintIssues.reduce((sum, i) => sum + (i.storyPoints ?? 0), 0),
    donePoints: activeSprintIssues.filter((i) => i.status === "DONE").reduce((sum, i) => sum + (i.storyPoints ?? 0), 0),
    inProgressPoints: activeSprintIssues
      .filter((i) => i.status === "IN_PROGRESS" || i.status === "IN_REVIEW")
      .reduce((sum, i) => sum + (i.storyPoints ?? 0), 0),
    toDoPoints: activeSprintIssues.filter((i) => i.status === "TO_DO").reduce((sum, i) => sum + (i.storyPoints ?? 0), 0),
  };

  // 6. Created vs. resolved over the last 7 real calendar days.
  const dayMs = 24 * 60 * 60 * 1000;
  const sevenDaysAgo = new Date(Date.now() - 6 * dayMs);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const resolvedHistory =
    authorizedProjectIds.length > 0
      ? await prisma.issueHistory.findMany({
          where: {
            field: "status",
            newValue: "DONE",
            createdAt: { gte: sevenDaysAgo },
            issue: { projectId: { in: authorizedProjectIds } },
          },
          select: { createdAt: true },
        })
      : [];

  const dayKey = (d: Date) => d.toISOString().slice(0, 10);
  const createdVsResolved = Array.from({ length: 7 }, (_, idx) => {
    const date = new Date(sevenDaysAgo.getTime() + idx * dayMs);
    const key = dayKey(date);
    return {
      label: date.toLocaleDateString("en-US", { weekday: "short" }),
      created: allIssues.filter((i) => dayKey(new Date(i.createdAt)) === key).length,
      resolved: resolvedHistory.filter((h) => dayKey(new Date(h.createdAt)) === key).length,
    };
  });

  // 7. Risk detector: overdue issues, plus issues still blocked by an
  // unresolved BLOCKS link. Deterministic, not a model call — see
  // AIRiskDetectorGadget's comment for why it keeps the "AI" label anyway.
  const now = new Date();
  const overdueRisks = allIssues
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

  const blockingLinks =
    authorizedProjectIds.length > 0
      ? await prisma.issueLink.findMany({
          where: {
            relation: "BLOCKS",
            targetIssue: { projectId: { in: authorizedProjectIds }, status: { not: "DONE" } },
            sourceIssue: { status: { not: "DONE" } },
          },
          include: {
            sourceIssue: { select: { key: true } },
            targetIssue: { select: { id: true, key: true, summary: true } },
          },
        })
      : [];
  const blockedRisks = blockingLinks.map((l) => ({
    id: `blocked-${l.id}`,
    severity: "HIGH" as const,
    issueKey: l.targetIssue.key,
    summary: l.targetIssue.summary,
    riskMessage: `Blocked by ${l.sourceIssue.key}`,
  }));

  const risks = [...overdueRisks, ...blockedRisks];

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
        sprintHealth={sprintHealth}
        createdVsResolved={createdVsResolved}
        risks={risks}
      />
    </div>
  );
}
