import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { getProjectMetrics } from "@/lib/reports";
import { Breadcrumbs } from "@/components/nav/Breadcrumbs";
import { DashboardView } from "@/components/dashboards/DashboardView";
import { CreateIssueModal } from "@/components/issues/CreateIssueModal";
import { Button } from "@/components/ui/Button";

export default async function DashboardsPage() {
  const user = await getAuthUser();
  const membership = await prisma.membership.findFirst({ where: { userId: user.id } });
  const siteId = membership?.siteId ?? (await prisma.site.findFirst())?.id ?? "";

  const project = await prisma.project.findFirst({ where: { siteId } });

  const metrics = project ? await getProjectMetrics(project.id) : { totalIssues: 0, statusCounts: {}, priorityCounts: {} };

  const assignedIssues = await prisma.issue.findMany({
    where: { assigneeId: user.id },
    include: { project: { select: { key: true } } },
    take: 5,
    orderBy: { updatedAt: "desc" },
  });

  const recentActivity = await prisma.issueHistory.findMany({
    include: {
      author: { select: { name: true } },
      issue: { select: { key: true, project: { select: { key: true } } } },
    },
    take: 6,
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-1 flex-col px-8 py-6 overflow-y-auto">
      <Breadcrumbs items={[{ label: "Dashboards", href: "/dashboards" }, { label: "Main Dashboard" }]} />
      <div className="mt-2 mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text">Default Workspace Dashboard</h1>
          <p className="text-xs text-text-subtle">Real-time status overview and assigned workload</p>
        </div>
        <CreateIssueModal trigger={<Button appearance="primary">Create issue</Button>} />
      </div>

      <DashboardView
        statusCounts={metrics.statusCounts}
        priorityCounts={metrics.priorityCounts}
        assignedIssues={assignedIssues}
        recentActivity={recentActivity}
      />
    </div>
  );
}
