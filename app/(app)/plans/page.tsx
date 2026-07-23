import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { Breadcrumbs } from "@/components/nav/Breadcrumbs";
import { CreateIssueModal } from "@/components/issues/CreateIssueModal";
import { Button } from "@/components/ui/Button";
import { Map, Calendar, Target, CheckCircle2, Clock, Layers, ArrowRight } from "lucide-react";
import Link from "next/link";

export default async function PlansPage() {
  const user = await getAuthUser();
  const membership = await prisma.membership.findFirst({ where: { userId: user.id } });
  const siteId = membership?.siteId ?? (await prisma.site.findFirst())?.id ?? "";

  const projects = await prisma.project.findMany({
    where: { siteId },
    include: {
      sprints: {
        orderBy: { createdAt: "desc" },
      },
      issues: {
        select: {
          id: true,
          status: true,
          type: true,
          storyPoints: true,
        },
      },
    },
  });

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
            High-level feature milestones, active sprint timelines, and release goals across your workspace projects.
          </p>
        </div>
        <CreateIssueModal trigger={
          <Button appearance="primary" className="shrink-0">
            + New plan feature
          </Button>
        } />
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <div className="rounded-[14px] border border-border-default bg-surface p-5 shadow-xs">
          <div className="flex items-center justify-between text-subtle mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-subtlest">Active Projects</span>
            <Layers size={18} className="text-brand" />
          </div>
          <p className="text-3xl font-bold text-default tracking-tight">{projects.length}</p>
          <span className="text-[12px] text-subtle">Projects actively being tracked</span>
        </div>

        <div className="rounded-[14px] border border-border-default bg-surface p-5 shadow-xs">
          <div className="flex items-center justify-between text-subtle mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-subtlest">Active Sprints</span>
            <Calendar size={18} className="text-purple" />
          </div>
          <p className="text-3xl font-bold text-default tracking-tight">
            {projects.reduce((acc, p) => acc + p.sprints.filter((s) => s.status === "ACTIVE").length, 0)}
          </p>
          <span className="text-[12px] text-subtle">Sprints currently executing</span>
        </div>

        <div className="rounded-[14px] border border-border-default bg-surface p-5 shadow-xs">
          <div className="flex items-center justify-between text-subtle mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-subtlest">Workspace Velocity</span>
            <CheckCircle2 size={18} className="text-success" />
          </div>
          <p className="text-3xl font-bold text-success tracking-tight">
            {projects.reduce(
              (acc, p) => acc + p.issues.filter((i) => i.status === "DONE").reduce((sum, i) => sum + (i.storyPoints ?? 1), 0),
              0
            )} pts
          </p>
          <span className="text-[12px] text-success font-medium">Completed story points</span>
        </div>
      </div>

      {/* Project Roadmaps & Milestones List */}
      <div className="flex flex-col gap-6">
        <h2 className="text-[16px] font-bold text-default tracking-tight">Project Milestones & Iterations</h2>

        {projects.length === 0 ? (
          <div className="rounded-[14px] border border-dashed border-border-default bg-surface p-12 text-center">
            <Map size={32} className="text-subtlest mx-auto mb-3" />
            <p className="text-[14px] font-semibold text-default">No projects in this workspace yet</p>
            <p className="text-[12px] text-subtle mt-1 mb-4">Create a project to start planning sprints and roadmaps.</p>
            <Link href="/projects">
              <Button appearance="primary">Go to Projects</Button>
            </Link>
          </div>
        ) : (
          projects.map((project) => {
            const totalIssues = project.issues.length;
            const doneCount = project.issues.filter((i) => i.status === "DONE").length;
            const completionPct = totalIssues > 0 ? Math.round((doneCount / totalIssues) * 100) : 0;
            const activeSprint = project.sprints.find((s) => s.status === "ACTIVE");

            return (
              <div key={project.id} className="rounded-[14px] border border-border-default bg-surface p-6 shadow-xs flex flex-col gap-5">
                <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-border-default">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-brand/10 text-brand font-bold text-lg">
                      {project.key.slice(0, 2)}
                    </div>
                    <div>
                      <h3 className="text-[16px] font-bold text-default tracking-tight">{project.name}</h3>
                      <p className="text-[12px] text-subtle font-mono">{project.key} • {totalIssues} total issues</p>
                    </div>
                  </div>

                  <Link href={`/projects/${project.key}/board`}>
                    <Button appearance="default" className="text-[12px] flex items-center gap-1.5">
                      Open Board <ArrowRight size={13} />
                    </Button>
                  </Link>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex items-center justify-between text-[12px] mb-1.5">
                    <span className="font-semibold text-subtle">Overall Release Progress</span>
                    <span className="font-bold text-default">{doneCount}/{totalIssues} done ({completionPct}%)</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-neutral overflow-hidden">
                    <div
                      style={{ width: `${completionPct}%` }}
                      className="h-full rounded-full bg-brand transition-all duration-700"
                    />
                  </div>
                </div>

                {/* Active Sprint Goal section */}
                {activeSprint ? (
                  <div className="rounded-[10px] border border-brand/20 bg-brand/5 p-4 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-brand uppercase tracking-wider">Active Sprint: {activeSprint.name}</span>
                      <span className="text-[11px] text-brand font-semibold">
                        {activeSprint.endDate ? `Ends ${new Date(activeSprint.endDate).toLocaleDateString()}` : "Active"}
                      </span>
                    </div>
                    {activeSprint.goal ? (
                      <p className="text-[13px] font-medium text-default flex items-start gap-1.5">
                        <Target size={14} className="text-brand shrink-0 mt-0.5" />
                        <span>{activeSprint.goal}</span>
                      </p>
                    ) : (
                      <p className="text-[12px] text-subtle italic">No explicit goal defined for this sprint.</p>
                    )}
                  </div>
                ) : (
                  <div className="rounded-[10px] border border-border-default bg-neutral/40 p-3 text-[12px] text-subtle italic">
                    No active sprint running right now. Plan next sprint in the backlog.
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
