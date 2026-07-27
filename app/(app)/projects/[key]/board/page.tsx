import { redirect } from "next/navigation";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { requireMembership, checkProjectAccess, getBoardIssues } from "@/lib/dal";
import { getSprintsByProject } from "@/lib/sprints";
import { getUsersForSite } from "@/lib/users";
import { KanbanBoard } from "@/components/board/KanbanBoard";
import { BoardNotFound } from "@/components/projects/BoardNotFound";

import { resolveProjectByKey, getDeletedBoardLog } from "@/lib/projects";
import { getAdminContactForSite } from "@/lib/tenant";
import { DeletedBoardBanner } from "@/components/projects/DeletedBoardBanner";
import { AccessRevokedBanner } from "@/components/projects/AccessRevokedBanner";

export default async function BoardPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const upperKey = key.toUpperCase();
  const { userId, siteId, role } = await requireMembership();

  const project = await resolveProjectByKey(userId, siteId, key);

  if (!project) {
    const deletedLog = await getDeletedBoardLog(siteId, key);
    if (deletedLog) {
      return (
        <DeletedBoardBanner
          projectKey={deletedLog.projectKey}
          projectName={deletedLog.projectName}
          deletedByName={deletedLog.deletedByName}
          deletedByEmail={deletedLog.deletedByEmail}
          deletedAt={deletedLog.createdAt}
        />
      );
    }
    return <BoardNotFound projectKey={upperKey} isAdmin={role === "ADMIN"} />;
  }

  const access = await checkProjectAccess(userId, project.id, project.siteId);
  if (!access) {
    const adminContact = await getAdminContactForSite(project.siteId);
    return (
      <AccessRevokedBanner
        projectKey={project.key}
        projectName={project.name}
        adminName={adminContact.name ?? "Workspace Admin"}
        adminEmail={adminContact.email}
      />
    );
  }

  const [issues, sprints, projectMembers, siteUsers, star] = await Promise.all([
    getBoardIssues(project.id),
    getSprintsByProject(project.id),
    import("@/lib/projects").then((m) => m.getProjectMembers(project.id)),
    getUsersForSite(project.siteId),
    prisma.star.findUnique({
      where: { userId_projectId: { userId, projectId: project.id } },
    }),
  ]);

  const activeUsers = projectMembers.map((m) => m.user);
  const availableUsers = activeUsers.length > 0 ? activeUsers : siteUsers;
  const isOwnerOrAdmin = role === "ADMIN" || project.leadId === userId || access.projectRole === "WORKSPACE_ADMIN" || access.projectRole === "ADMIN";

  return (
    <main className="flex-1 px-8 py-6 overflow-y-auto">
      <KanbanBoard
        issues={issues.map((i) => ({ ...i, projectKey: project.key }))}
        sprints={sprints.map((s) => ({
          ...s,
          issues: s.issues.map((i) => ({ ...i, projectKey: project.key })),
        }))}
        availableUsers={availableUsers}
        currentUserId={userId}
        projectName={project.name}
        projectKey={project.key}
        projectId={project.id}
        isStarred={Boolean(star)}
        isOwnerOrAdmin={isOwnerOrAdmin}
      />
    </main>
  );
}
