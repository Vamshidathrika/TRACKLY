import { prisma } from "./prisma";
import { getCache, setCache, delCache } from "./redis";

export async function toggleStar(userId: string, projectId: string) {
  const existing = await prisma.star.findUnique({
    where: { userId_projectId: { userId, projectId } },
  });
  if (existing) {
    await prisma.star.delete({ where: { userId_projectId: { userId, projectId } } });
    await delCache(`user:chrome:${userId}`);
    return { starred: false };
  }
  await prisma.star.create({ data: { userId, projectId } });
  await delCache(`user:chrome:${userId}`);
  return { starred: true };
}

export async function getChromeData(userId: string) {
  const cacheKey = `user:chrome:${userId}`;
  const cached = await getCache<{ projects: { id: string; key: string; name: string }[]; starredProjectIds: string[] }>(cacheKey);
  if (cached) return cached;

  const memberships = await prisma.membership.findMany({ where: { userId }, select: { siteId: true } });
  const siteIds = memberships.map((m) => m.siteId);
  const projects = await prisma.project.findMany({
    where: { siteId: { in: siteIds } },
    select: { id: true, key: true, name: true },
    orderBy: { name: "asc" },
  });
  const stars = await prisma.star.findMany({ where: { userId }, select: { projectId: true } });
  const data = { projects, starredProjectIds: stars.map((s) => s.projectId) };

  await setCache(cacheKey, data, 300); // 5 minutes cache
  return data;
}
