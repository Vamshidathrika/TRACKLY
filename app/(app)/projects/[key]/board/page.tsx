import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireMembership, checkProjectAccess } from "@/lib/tenant";
import { getIssuesByProject } from "@/lib/issues";
import { getSprintsByProject } from "@/lib/sprints";
import { getUsersForSite } from "@/lib/users";
import { KanbanBoard } from "@/components/board/KanbanBoard";
import { BoardNotFound } from "@/components/projects/BoardNotFound";

export default async function BoardPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const upperKey = key.toUpperCase();
  const { userId, siteId, role } = await requireMembership();

  let project = await prisma.project.findFirst({
    where: { key: upperKey, siteId },
    select: { id: true, key: true, name: true, siteId: true },
  });

  if (!project) {
    project = await prisma.project.findFirst({
      where: { key: upperKey },
      select: { id: true, key: true, name: true, siteId: true },
    });
  }

  if (!project) {
    return <BoardNotFound projectKey={upperKey} isAdmin={role === "ADMIN"} />;
  }

  const access = await checkProjectAccess(userId, project.id, project.siteId);
  if (!access) redirect("/your-work");

  const [issues, sprints, siteUsers, star] = await Promise.all([
    getIssuesByProject(project.id),
    getSprintsByProject(project.id),
    getUsersForSite(project.siteId),
    prisma.star.findUnique({
      where: { userId_projectId: { userId, projectId: project.id } },
    }),
  ]);

  return (
    <main className="flex-1 px-8 py-6 overflow-y-auto">
      <KanbanBoard
        issues={issues.map((i) => ({ ...i, projectKey: project.key }))}
        sprints={sprints.map((s) => ({
          ...s,
          issues: s.issues.map((i) => ({ ...i, projectKey: project.key })),
        }))}
        availableUsers={siteUsers}
        currentUserId={userId}
        projectName={project.name}
        projectKey={project.key}
        projectId={project.id}
        isStarred={Boolean(star)}
      />
    </main>
  );
}
