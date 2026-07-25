import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireMembership, checkProjectAccess } from "@/lib/tenant";
import { resolveProjectByKey } from "@/lib/projects";
import { getSprintsByProject } from "@/lib/sprints";
import { getBurndownData, getVelocityData, getProjectMetrics } from "@/lib/reports";
import { Breadcrumbs } from "@/components/nav/Breadcrumbs";
import { ReportsView } from "@/components/reports/ReportsView";
import { CreateIssueModal } from "@/components/issues/CreateIssueModal";
import { Button } from "@/components/ui/Button";

import { BoardNotFound } from "@/components/projects/BoardNotFound";

export default async function ReportsPage({ params }: { params: Promise<{ key: string }> }) {
  const { userId, siteId, role } = await requireMembership();
  const { key } = await params;
  const upperKey = key.toUpperCase();

  const project = await resolveProjectByKey(userId, siteId, key);

  if (!project) {
    return <BoardNotFound projectKey={upperKey} isAdmin={role === "ADMIN"} />;
  }

  const access = await checkProjectAccess(userId, project.id, project.siteId);
  if (!access) redirect("/your-work");

  const [sprints, velocity, metrics] = await Promise.all([
    getSprintsByProject(project.id).catch(() => []),
    getVelocityData(project.id).catch(() => []),
    getProjectMetrics(project.id).catch(() => ({ statusCounts: {}, typeCounts: {}, priorityCounts: {} })),
  ]);

  const activeSprint = sprints.find((s) => s.status === "ACTIVE") || sprints[0];
  const burndown = await getBurndownData(activeSprint?.id ?? "").catch(() => ({
    sprintName: activeSprint?.name ?? "Sprint",
    totalPoints: 0,
    pointsDone: 0,
    pointsRemaining: 0,
    timeline: [],
  }));

  const cumulativeData = Object.entries(metrics.statusCounts).map(([status, count]) => ({
    status,
    count: count as number,
  }));

  return (
    <main className="flex-1 px-8 py-6 overflow-y-auto">
      <Breadcrumbs items={[{ label: "Projects", href: "/projects" }, { label: project.name, href: `/projects/${project.key}` }, { label: "Reports" }]} />
      <div className="mt-2 mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text">{project.name} Reports</h1>
          <p className="text-xs text-text-subtle">Agile metrics & performance insights • {project.key}</p>
        </div>
        <CreateIssueModal defaultProjectId={project.id} trigger={<Button appearance="primary">Create task</Button>} />
      </div>

      <ReportsView burndown={burndown} velocity={velocity} cumulative={cumulativeData} />
    </main>
  );
}
