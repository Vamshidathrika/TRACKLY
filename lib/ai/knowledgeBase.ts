import { prisma } from "../prisma";

export async function getPlatformKnowledgeBase(siteId: string) {
  const [projects, members, sprints, issues] = await Promise.all([
    prisma.project.findMany({
      where: { siteId },
      select: { id: true, name: true, key: true, type: true },
    }),
    prisma.membership.findMany({
      where: { siteId },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.sprint.findMany({
      where: { project: { siteId } },
      select: { id: true, name: true, status: true, projectId: true },
    }),
    prisma.issue.findMany({
      where: { project: { siteId } },
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
