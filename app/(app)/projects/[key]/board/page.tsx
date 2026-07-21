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

        <KanbanBoard
          issues={issues.map((i) => ({ ...i, projectKey: project.key }))}
          currentUserId={user.id}
          projectName={project.name}
          projectKey={project.key}
        />
      </main>
    </div>
  );
}
