import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { YourWorkView } from "./YourWorkView";

export default async function YourWorkPage() {
  const user = await getAuthUser();
  const memberships = await prisma.membership.findMany({
    where: { userId: user.id },
    include: { site: { include: { projects: true } } },
    orderBy: { createdAt: "desc" },
  });

  const siteIds = memberships.map((m) => m.siteId);

  const [assignedIssues, reportedIssues, userProjects] = await Promise.all([
    prisma.issue.findMany({
      where: { assigneeId: user.id },
      include: { project: { select: { key: true, name: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.issue.findMany({
      where: { reporterId: user.id },
      include: { project: { select: { key: true, name: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    siteIds.length > 0
      ? prisma.project.findMany({
          where: { siteId: { in: siteIds } },
          select: { id: true, key: true, name: true, _count: { select: { issues: true } } },
          orderBy: { createdAt: "desc" },
        })
      : [],
  ]);

  return (
    <YourWorkView
      assignedIssues={assignedIssues}
      reportedIssues={reportedIssues}
      userProjects={userProjects}
      userName={user.name ?? user.email}
    />
  );
}
