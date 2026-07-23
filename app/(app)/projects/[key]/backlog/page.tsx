import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { getSprintsByProject } from "@/lib/sprints";
import { getIssuesByProject } from "@/lib/issues";
import { Breadcrumbs } from "@/components/nav/Breadcrumbs";
import { BacklogView } from "@/components/backlog/BacklogView";
import { CreateIssueModal } from "@/components/issues/CreateIssueModal";
import { Button } from "@/components/ui/Button";

export default async function BacklogPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const upperKey = key.toUpperCase();
  const user = await getAuthUser();

  // 1. Resolve project globally by key across all workspace sites
  const project = await prisma.project.findFirst({
    where: { key: upperKey },
    select: { id: true, key: true, name: true, siteId: true },
  });

  if (!project) redirect("/projects");

  // 2. Collaborative Access: Auto-grant Membership if visiting a shared backlog link
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
  const allIssues = await getIssuesByProject(project.id);
  const backlogIssues = allIssues.filter((i) => !i.sprintId);

  return (
    <main className="flex-1 px-8 py-6 overflow-y-auto">
      <Breadcrumbs items={[{ label: "Projects", href: "/projects" }, { label: project.name, href: `/projects/${project.key}` }, { label: "Backlog" }]} />
      <div className="mt-2 mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text">{project.name} backlog</h1>
          <p className="text-xs text-text-subtle">Sprint Planning • {project.key}</p>
        </div>
        <CreateIssueModal trigger={<Button appearance="primary">Create issue</Button>} />
      </div>

      <BacklogView
        projectId={project.id}
        projectKey={project.key}
        sprints={sprints}
        backlogIssues={backlogIssues.map((i) => ({ ...i, projectKey: project.key }))}
      />
    </main>
  );
}
