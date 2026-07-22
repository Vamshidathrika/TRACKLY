import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { getProjectByKey } from "@/lib/projects";
import { getIssuesByProject } from "@/lib/issues";
import { KanbanBoard } from "@/components/board/KanbanBoard";

export default async function BoardPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const user = await getAuthUser();

  const membership = await prisma.membership.findFirst({ where: { userId: user.id } });
  const siteId = membership?.siteId ?? (await prisma.site.findFirst())?.id ?? "";

  const project = await getProjectByKey(siteId, key);
  if (!project) redirect("/projects");

  const issues = await getIssuesByProject(project.id);
  const star = await prisma.star.findUnique({
    where: { userId_projectId: { userId: user.id, projectId: project.id } },
  });

  return (
    <main className="flex-1 px-8 py-6 overflow-y-auto">
      <KanbanBoard
        issues={issues.map((i) => ({ ...i, projectKey: project.key }))}
        currentUserId={user.id}
        projectName={project.name}
        projectKey={project.key}
        projectId={project.id}
        isStarred={Boolean(star)}
      />
    </main>
  );
}
