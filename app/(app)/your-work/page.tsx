import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/tenant";
import { getUsersForAuthUser } from "@/lib/users";
import { getProjectsForUser } from "@/lib/projects";
import { YourWorkView } from "./YourWorkView";
import { getAuthUser } from "@/lib/auth";

export default async function YourWorkPage() {
  try {
    const { userId, siteId } = await requireMembership();
    const user = await getAuthUser();

    const userMemberships = await prisma.membership.findMany({ where: { userId }, select: { siteId: true } });
    const siteIds = Array.from(new Set(userMemberships.map((m) => m.siteId).concat(siteId)));

    const [assignedIssues, reportedIssues, userProjects, availableUsers] = await Promise.all([
      prisma.issue.findMany({
        where: { assigneeId: userId, project: { siteId: { in: siteIds } } },
        include: {
          project: { select: { key: true, name: true } },
          assignee: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: { updatedAt: "desc" },
      }).catch(() => []),
      prisma.issue.findMany({
        where: { reporterId: userId, project: { siteId: { in: siteIds } } },
        include: {
          project: { select: { key: true, name: true } },
          assignee: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: { updatedAt: "desc" },
      }).catch(() => []),
      getProjectsForUser(siteId, userId).catch(() => []),
      getUsersForAuthUser(userId).catch(() => []),
    ]);

    return (
      <YourWorkView
        assignedIssues={(assignedIssues || []).map((i) => ({ ...i, project: i.project ?? { key: "PRJ", name: "Project" } }))}
        reportedIssues={(reportedIssues || []).map((i) => ({ ...i, project: i.project ?? { key: "PRJ", name: "Project" } }))}
        userProjects={userProjects || []}
        userName={user?.name ?? user?.email ?? "Teammate"}
        availableUsers={availableUsers || []}
      />
    );
  } catch (err: any) {
    if (err?.digest?.startsWith("NEXT_REDIRECT") || err?.message?.includes("NEXT_REDIRECT")) {
      throw err;
    }
    console.error("[YourWorkPage Recoverable Error]:", err);
    return (
      <YourWorkView
        assignedIssues={[]}
        reportedIssues={[]}
        userProjects={[]}
        userName="Teammate"
        availableUsers={[]}
      />
    );
  }
}
