import { prisma } from "./prisma";

export async function toggleStar(userId: string, projectId: string) {
  const existing = await prisma.star.findUnique({
    where: { userId_projectId: { userId, projectId } },
  });
  if (existing) {
    await prisma.star.delete({ where: { userId_projectId: { userId, projectId } } });
    return { starred: false };
  }
  await prisma.star.create({ data: { userId, projectId } });
  return { starred: true };
}

export async function getChromeData(userId: string) {
  const memberships = await prisma.membership.findMany({ where: { userId }, select: { siteId: true } });
  const siteIds = memberships.map((m) => m.siteId);
  const projects = await prisma.project.findMany({
    where: { siteId: { in: siteIds } },
    select: { id: true, key: true, name: true },
    orderBy: { name: "asc" },
  });
  const stars = await prisma.star.findMany({ where: { userId }, select: { projectId: true } });
  return { projects, starredProjectIds: stars.map((s) => s.projectId) };
}
