import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { getSprintsByProject } from "@/lib/sprints";
import { getBurndownData, getVelocityData, getProjectMetrics } from "@/lib/reports";
import { Breadcrumbs } from "@/components/nav/Breadcrumbs";
import { ReportsView } from "@/components/reports/ReportsView";
import { CreateIssueModal } from "@/components/issues/CreateIssueModal";
import { Button } from "@/components/ui/Button";

export default async function ReportsPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const upperKey = key.toUpperCase();
  const user = await getAuthUser();

  const project = await prisma.project.findFirst({
    where: { key: upperKey },
    select: { id: true, key: true, name: true, siteId: true },
  });

  if (!project) redirect("/projects");

  // Collaborative Access check
  const membership = await prisma.membership.findFirst({
    where: { userId: user.id, siteId: project.siteId },
  });

  if (!membership) {
    await prisma.membership.create({
      data: { userId: user.id, siteId: project.siteId, role: "MEMBER" },
    });
    const { delCache } = await import("@/lib/redis");
    await delCache(`user:chrome:${user.id}`);
  }

  const sprints = await getSprintsByProject(project.id);
  const activeSprint = sprints.find((s) => s.status === "ACTIVE") || sprints[0];

  const [burndown, velocity, metrics] = await Promise.all([
    getBurndownData(activeSprint?.id ?? ""),
    getVelocityData(project.id),
    getProjectMetrics(project.id),
  ]);

  const cumulativeData = Object.entries(metrics.statusCounts).map(([status, count]) => ({
    status,
    count,
  }));

  return (
    <main className="flex-1 px-8 py-6 overflow-y-auto">
      <Breadcrumbs items={[{ label: "Projects", href: "/projects" }, { label: project.name, href: `/projects/${project.key}` }, { label: "Reports" }]} />
      <div className="mt-2 mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text">{project.name} Reports</h1>
          <p className="text-xs text-text-subtle">Agile metrics & performance insights • {project.key}</p>
        </div>
        <CreateIssueModal trigger={<Button appearance="primary">Create issue</Button>} />
      </div>

      <ReportsView burndown={burndown} velocity={velocity} cumulative={cumulativeData} />
    </main>
  );
}
