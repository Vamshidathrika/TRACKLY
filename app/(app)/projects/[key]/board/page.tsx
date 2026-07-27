import { redirect } from "next/navigation";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { requireMembership, checkProjectAccess, getBoardIssues } from "@/lib/dal";
import { getSprintsByProject } from "@/lib/sprints";
import { getUsersForSite } from "@/lib/users";
import { KanbanBoard } from "@/components/board/KanbanBoard";
import { BoardNotFound } from "@/components/projects/BoardNotFound";

import { resolveProjectByKey } from "@/lib/projects";

export default async function BoardPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const upperKey = key.toUpperCase();
  const { userId, siteId, role } = await requireMembership();

  const project = await resolveProjectByKey(userId, siteId, key);

  if (!project) {
    return <BoardNotFound projectKey={upperKey} isAdmin={role === "ADMIN"} />;
  }

  const access = await checkProjectAccess(userId, project.id, project.siteId);
  if (!access) redirect("/your-work");

  const [issues, sprints, siteUsers, star] = await Promise.all([
    getBoardIssues(project.id),
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
