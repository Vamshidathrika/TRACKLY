import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { getProjectByKey } from "@/lib/projects";
import { getIssuesByProject } from "@/lib/issues";
import { Sidebar } from "@/components/nav/Sidebar";
import { Breadcrumbs } from "@/components/nav/Breadcrumbs";
import { KanbanBoard } from "@/components/board/KanbanBoard";
import { CreateIssueModal } from "@/components/issues/CreateIssueModal";
import { Button } from "@/components/ui/Button";

export default async function BoardPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const user = await getAuthUser();

  const membership = await prisma.membership.findFirst({ where: { userId: user.id } });
  const siteId = membership?.siteId ?? (await prisma.site.findFirst())?.id ?? "";

  const project = await getProjectByKey(siteId, key);
  if (!project) redirect("/projects");

  const issues = await getIssuesByProject(project.id);

  return (
    <div className="flex flex-1">
      <Sidebar projectName={project.name} projectKey={project.key} />
      <main className="flex-1 px-8 py-6 overflow-y-auto">
        <Breadcrumbs items={[{ label: "Projects", href: "/projects" }, { label: project.name, href: `/projects/${project.key}` }, { label: "Board" }]} />
        <div className="mt-2 mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-text">{project.name} board</h1>
            <p className="text-xs text-text-subtle">Kanban flow • {project.key}</p>
          </div>
          <CreateIssueModal trigger={<Button appearance="primary">Create issue</Button>} />
        </div>

        <KanbanBoard issues={issues.map((i) => ({ ...i, projectKey: project.key }))} currentUserId={user.id} />
      </main>
    </div>
  );
}
