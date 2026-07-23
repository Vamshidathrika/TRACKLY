import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/tenant";
import { getUsersForSite } from "@/lib/users";
import { getProjectsForUser } from "@/lib/projects";
import { YourWorkView } from "./YourWorkView";
import { getAuthUser } from "@/lib/auth";

export default async function YourWorkPage() {
  const { userId, siteId } = await requireMembership();
  const user = await getAuthUser();

  const [assignedIssues, reportedIssues, userProjects, availableUsers] = await Promise.all([
    prisma.issue.findMany({
      where: { assigneeId: userId, project: { siteId } },
      include: {
        project: { select: { key: true, name: true } },
        assignee: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.issue.findMany({
      where: { reporterId: userId, project: { siteId } },
      include: {
        project: { select: { key: true, name: true } },
        assignee: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    getProjectsForUser(siteId, userId),
    getUsersForSite(siteId),
  ]);

  return (
    <YourWorkView
      assignedIssues={assignedIssues.map((i) => ({ ...i, project: i.project ?? { key: "PRJ", name: "Project" } }))}
      reportedIssues={reportedIssues.map((i) => ({ ...i, project: i.project ?? { key: "PRJ", name: "Project" } }))}
      userProjects={userProjects}
      userName={user.name ?? user.email}
      availableUsers={availableUsers}
    />
  );
}
