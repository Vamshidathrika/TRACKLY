import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/tenant";
import { getProjectsForUser } from "@/lib/projects";
import { Breadcrumbs } from "@/components/nav/Breadcrumbs";
import { CreateIssueModal } from "@/components/issues/CreateIssueModal";
import { Button } from "@/components/ui/Button";
import {
  Map,
  Calendar,
  Target,
  CheckCircle2,
  Layers,
  ArrowRight,
  Link2,
  AlertCircle,
  TrendingUp,
  Clock,
} from "lucide-react";
import Link from "next/link";

export default async function PlansPage() {
  const { userId, siteId } = await requireMembership();

  const userProjects = await getProjectsForUser(siteId, userId);
  const authorizedProjectIds = userProjects.map((p) => p.id);

  const projects =
    authorizedProjectIds.length > 0
      ? await prisma.project.findMany({
          where: { id: { in: authorizedProjectIds } },
          include: {
            sprints: {
              orderBy: { createdAt: "desc" },
            },
            issues: {
              select: {
                id: true,
                key: true,
                summary: true,
                status: true,
                type: true,
                priority: true,
                storyPoints: true,
                dueDate: true,
              },
            },
          },
        })
      : [];

  // ─── Cross-Project Dependency Analysis ──────────────────────────────────────
  // Find issues that are blocked across different projects by scanning summary/key references
  const allIssues = projects.flatMap((p) =>
    p.issues.map((i) => ({ ...i, projectKey: p.key, projectName: p.name }))
  );

  const issueKeySet = new Set(allIssues.map((i) => i.key));

  // Cross-project dependencies: issues with "blocked by" or other issue keys in their summary
  const crossProjectLinks: {
    fromKey: string;
    fromProject: string;
    toKey: string;
    toProject: string;
    type: "BLOCKED_BY" | "RELATES_TO";
  }[] = [];

  for (const issue of allIssues) {
    // Pattern: find references like TRK-123, PRJ-456 in summary
    const matches = issue.summary.match(/[A-Z]{2,6}-\d+/g) ?? [];
    for (const ref of matches) {
      if (ref !== issue.key && issueKeySet.has(ref)) {
        const targetIssue = allIssues.find((i) => i.key === ref);
        if (targetIssue && targetIssue.projectKey !== issue.projectKey) {
          crossProjectLinks.push({
            fromKey: issue.key,
            fromProject: issue.projectName,
            toKey: ref,
            toProject: targetIssue.projectName,
            type: "RELATES_TO",
          });
        }
      }
    }
  }

  // Overdue issues across all projects
  const now = new Date();
  const overdueIssues = allIssues.filter(
    (i) => i.dueDate && new Date(i.dueDate) < now && i.status !== "DONE"
  );

  return (
    <div className="flex flex-1 flex-col px-8 py-7 overflow-y-auto">
      <Breadcrumbs
        items={[{ label: "Workspace", href: "/your-work" }, { label: "Plans & Roadmap" }]}
      />

      {/* Header */}
      <div className="mt-4 mb-7 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold text-default tracking-tight leading-tight flex items-center gap-2.5">
            <Map className="text-brand" size={24} />
            Plans & Product Roadmap
          </h1>
          <p className="mt-1 text-[13px] text-subtle">
            High-level feature milestones, active sprint timelines, release goals, and
            cross-project dependencies across your workspace.
          </p>
        </div>
        <CreateIssueModal
          trigger={
            <Button appearance="primary" className="shrink-0">
              + New plan feature
            </Button>
          }
        />
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="rounded-[14px] border border-border-default bg-surface p-5 shadow-xs">
          <div className="flex items-center justify-between text-subtle mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-subtlest">
              Active Projects
            </span>
            <Layers size={18} className="text-brand" />
          </div>
          <p className="text-3xl font-bold text-default tracking-tight">{projects.length}</p>
          <span className="text-[12px] text-subtle">Projects tracked</span>
        </div>

        <div className="rounded-[14px] border border-border-default bg-surface p-5 shadow-xs">
          <div className="flex items-center justify-between text-subtle mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-subtlest">
              Active Sprints
            </span>
            <Calendar size={18} className="text-purple" />
          </div>
          <p className="text-3xl font-bold text-default tracking-tight">
            {projects.reduce(
              (acc, p) => acc + p.sprints.filter((s) => s.status === "ACTIVE").length,
              0
            )}
          </p>
          <span className="text-[12px] text-subtle">Sprints executing</span>
        </div>

        <div className="rounded-[14px] border border-border-default bg-surface p-5 shadow-xs">
          <div className="flex items-center justify-between text-subtle mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-subtlest">
              Workspace Velocity
            </span>
            <TrendingUp size={18} className="text-success" />
          </div>
          <p className="text-3xl font-bold text-success tracking-tight">
            {projects.reduce(
              (acc, p) =>
                acc +
                p.issues
                  .filter((i) => i.status === "DONE")
                  .reduce((sum, i) => sum + (i.storyPoints ?? 1), 0),
              0
            )}{" "}
            pts
          </p>
          <span className="text-[12px] text-success font-medium">Completed story points</span>
        </div>

        <div className="rounded-[14px] border border-border-default bg-surface p-5 shadow-xs">
          <div className="flex items-center justify-between text-subtle mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-subtlest">
              Overdue Issues
            </span>
            <Clock size={18} className={overdueIssues.length > 0 ? "text-danger" : "text-subtle"} />
          </div>
          <p
            className={`text-3xl font-bold tracking-tight ${
              overdueIssues.length > 0 ? "text-danger" : "text-default"
            }`}
          >
            {overdueIssues.length}
          </p>
          <span className="text-[12px] text-subtle">Past due date</span>
        </div>
      </div>

      {/* Cross-Project Dependency Linker (Jira Advanced Roadmaps parity) */}
      {crossProjectLinks.length > 0 && (
        <div className="mb-8 rounded-[14px] border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/10 p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <Link2 size={16} className="text-amber-600" />
            <h2 className="text-[14px] font-bold text-amber-800 dark:text-amber-400">
              Cross-Project Dependencies Detected
            </h2>
            <span className="ml-auto text-[11px] font-bold bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded-full">
              {crossProjectLinks.length}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {crossProjectLinks.slice(0, 8).map((link, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-[12px] text-amber-900 dark:text-amber-300 bg-white dark:bg-amber-900/20 rounded-[8px] border border-amber-200 dark:border-amber-700/50 px-3 py-2"
              >
                <span className="font-mono font-bold text-brand">{link.fromKey}</span>
                <span className="text-subtle text-[10px]">{link.fromProject}</span>
                <ArrowRight size={12} className="text-amber-500 shrink-0 mx-1" />
                <span className="font-mono font-bold text-purple-600">{link.toKey}</span>
                <span className="text-subtle text-[10px]">{link.toProject}</span>
                <span className="ml-auto text-[10px] font-semibold text-amber-600 uppercase tracking-wider">
                  {link.type.replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overdue Issues Alert Banner */}
      {overdueIssues.length > 0 && (
        <div className="mb-8 rounded-[14px] border border-danger/30 bg-danger/5 p-4 flex items-start gap-3">
          <AlertCircle size={16} className="text-danger shrink-0 mt-0.5" />
          <div>
            <h3 className="text-[13px] font-bold text-danger mb-1">
              {overdueIssues.length} overdue issue{overdueIssues.length !== 1 ? "s" : ""} across workspace
            </h3>
            <div className="flex flex-wrap gap-2">
              {overdueIssues.slice(0, 6).map((i) => (
                <span
                  key={i.id}
                  className="font-mono text-[11px] font-bold text-danger bg-danger/10 border border-danger/20 px-2 py-0.5 rounded"
                >
                  {i.key}
                </span>
              ))}
              {overdueIssues.length > 6 && (
                <span className="text-[11px] text-subtle self-center">
                  +{overdueIssues.length - 6} more
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Project Roadmaps & Milestones List */}
      <div className="flex flex-col gap-6">
        <h2 className="text-[16px] font-bold text-default tracking-tight">
          Project Milestones & Iterations
        </h2>

        {projects.length === 0 ? (
          <div className="rounded-[14px] border border-dashed border-border-default bg-surface p-12 text-center">
            <Map size={32} className="text-subtlest mx-auto mb-3" />
            <p className="text-[14px] font-semibold text-default">
              No projects in this workspace yet
            </p>
            <p className="text-[12px] text-subtle mt-1 mb-4">
              Create a project to start planning sprints and roadmaps.
            </p>
            <Link href="/projects">
              <Button appearance="primary">Go to Projects</Button>
            </Link>
          </div>
        ) : (
          projects.map((project) => {
            const totalIssues = project.issues.length;
            const doneCount = project.issues.filter((i) => i.status === "DONE").length;
            const inProgressCount = project.issues.filter(
              (i) => i.status === "IN_PROGRESS" || i.status === "IN_REVIEW"
            ).length;
            const completionPct =
              totalIssues > 0 ? Math.round((doneCount / totalIssues) * 100) : 0;
            const activeSprint = project.sprints.find((s) => s.status === "ACTIVE");
            const totalPoints = project.issues.reduce((s, i) => s + (i.storyPoints ?? 0), 0);
            const donePoints = project.issues
              .filter((i) => i.status === "DONE")
              .reduce((s, i) => s + (i.storyPoints ?? 0), 0);

            return (
              <div
                key={project.id}
                className="rounded-[14px] border border-border-default bg-surface p-6 shadow-xs flex flex-col gap-5"
              >
                {/* Project Header */}
                <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-border-default">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-brand/10 text-brand font-bold text-lg">
                      {project.key.slice(0, 2)}
                    </div>
                    <div>
                      <h3 className="text-[16px] font-bold text-default tracking-tight">
                        {project.name}
                      </h3>
                      <p className="text-[12px] text-subtle font-mono">
                        {project.key} • {totalIssues} tasks • {totalPoints} pts total
                      </p>
                    </div>
                  </div>

                  <Link href={`/projects/${project.key}/board`}>
                    <Button
                      appearance="default"
                      className="text-[12px] flex items-center gap-1.5"
                    >
                      Open Board <ArrowRight size={13} />
                    </Button>
                  </Link>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex items-center justify-between text-[12px] mb-1.5">
                    <span className="font-semibold text-subtle">Overall Release Progress</span>
                    <span className="font-bold text-default">
                      {doneCount}/{totalIssues} done ({completionPct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-neutral overflow-hidden">
                    <div
                      style={{ width: `${completionPct}%` }}
                      className={`h-full rounded-full transition-all duration-700 ${
                        completionPct < 34 ? "bg-rose-500" : completionPct < 100 ? "bg-amber-500" : "bg-emerald-500"
                      }`}
                    />
                  </div>
                </div>

                {/* Issue status breakdown mini-row */}
                <div className="flex items-center gap-4 text-[11px] font-semibold">
                  <span className="flex items-center gap-1.5 text-subtle">
                    <span className="inline-block h-2 w-2 rounded-full bg-neutral-400" />
                    {totalIssues - doneCount - inProgressCount} To Do
                  </span>
                  <span className="flex items-center gap-1.5 text-brand">
                    <span className="inline-block h-2 w-2 rounded-full bg-brand" />
                    {inProgressCount} In Progress
                  </span>
                  <span className="flex items-center gap-1.5 text-success">
                    <span className="inline-block h-2 w-2 rounded-full bg-success" />
                    {doneCount} Done
                  </span>
                  <span className="ml-auto text-subtle">
                    {donePoints}/{totalPoints} pts shipped
                  </span>
                </div>

                {/* Active Sprint Goal section */}
                {activeSprint ? (
                  <div className="rounded-[10px] border border-brand/20 bg-brand/5 p-4 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-brand uppercase tracking-wider">
                        Active Sprint: {activeSprint.name}
                      </span>
                      <span className="text-[11px] text-brand font-semibold">
                        {activeSprint.endDate
                          ? `Ends ${new Date(activeSprint.endDate).toLocaleDateString()}`
                          : "Active"}
                      </span>
                    </div>
                    {activeSprint.goal ? (
                      <p className="text-[13px] font-medium text-default flex items-start gap-1.5">
                        <Target size={14} className="text-brand shrink-0 mt-0.5" />
                        <span>{activeSprint.goal}</span>
                      </p>
                    ) : (
                      <p className="text-[12px] text-subtle italic">
                        No explicit goal defined for this sprint.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="rounded-[10px] border border-border-default bg-neutral/40 p-3 text-[12px] text-subtle italic">
                    No active sprint running right now. Plan next sprint in the backlog.
                  </div>
                )}

                {/* Upcoming sprints */}
                {project.sprints.filter((s) => s.status === "FUTURE").length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-subtlest">
                      Upcoming Sprints
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {project.sprints
                        .filter((s) => s.status === "FUTURE")
                        .slice(0, 3)
                        .map((s) => (
                          <div
                            key={s.id}
                            className="flex items-center gap-1.5 text-[11px] font-medium text-subtle border border-border-default bg-surface rounded-[6px] px-2.5 py-1"
                          >
                            <CheckCircle2 size={11} className="text-subtlest" />
                            {s.name}
                            {s.endDate && (
                              <span className="text-subtlest">
                                · ends {new Date(s.endDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
