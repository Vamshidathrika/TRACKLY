import { prisma } from "../prisma";

export async function getPlatformKnowledgeBase(siteId: string, userId?: string) {
  let projectFilter: Record<string, any> = { siteId };
  if (userId) {
    const membership = await prisma.membership.findFirst({
      where: { userId, siteId, role: "ADMIN" },
    });
    if (!membership) {
      const userProjects = await prisma.projectMember.findMany({
        where: { userId },
        select: { projectId: true },
      });
      const leadProjects = await prisma.project.findMany({
        where: { siteId, leadId: userId },
        select: { id: true },
      });
      const allowedIds = Array.from(
        new Set([...userProjects.map((p) => p.projectId), ...leadProjects.map((p) => p.id)])
      );
      projectFilter = { siteId, id: { in: allowedIds } };
    }
  }

  const [projects, members, sprints, issues] = await Promise.all([
    prisma.project.findMany({
      where: projectFilter,
      select: { id: true, name: true, key: true, type: true },
    }),
    prisma.membership.findMany({
      where: { siteId },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.sprint.findMany({
      where: { project: projectFilter },
      select: { id: true, name: true, status: true, projectId: true },
    }),
    prisma.issue.findMany({
      where: { project: projectFilter },
      select: { id: true, key: true, summary: true, status: true, assigneeId: true, projectId: true },
      orderBy: { number: "desc" },
      take: 20,
    }),
  ]);

  return {
    projects: projects.map((p) => ({ id: p.id, name: p.name, key: p.key, type: p.type })),
    members: members.map((m) => ({ id: m.user.id, name: m.user.name, email: m.user.email, role: m.role })),
    sprints: sprints.map((s) => ({ id: s.id, name: s.name, status: s.status, projectId: s.projectId })),
    issues: issues.map((i) => ({ id: i.id, key: i.key, summary: i.summary, status: i.status, assigneeId: i.assigneeId })),
  };
}
