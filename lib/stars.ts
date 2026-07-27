import { prisma } from "./prisma";
import { getCache, setCache, delCache } from "./redis";

export async function toggleStar(userId: string, projectId: string) {
  try {
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
  } catch (err) {
    console.error("[toggleStar Error]:", err);
    return { starred: false };
  }
}

export async function getChromeData(userId: string, _siteId?: string) {
  try {
    const cacheKey = `user:chrome:${userId}`;
    const cached = await getCache<{ projects: { id: string; key: string; name: string }[]; starredProjectIds: string[] }>(cacheKey);
    if (cached) return cached;

    const memberships = await prisma.membership.findMany({
      where: { userId },
      select: { siteId: true, role: true },
    });

    if (memberships.length === 0) return { projects: [], starredProjectIds: [] };

    const adminSiteIds = memberships.filter((m) => m.role === "ADMIN").map((m) => m.siteId);

    const projectMembers = await prisma.projectMember.findMany({
      where: { userId },
      select: { projectId: true },
    });
    const allowedProjectIds = projectMembers.map((pm) => pm.projectId);

    const OR: any[] = [];
    if (adminSiteIds.length > 0) {
      OR.push({ siteId: { in: adminSiteIds } });
    }
    if (allowedProjectIds.length > 0) {
      OR.push({ id: { in: allowedProjectIds } });
    }
    OR.push({ leadId: userId });

    const projects = await prisma.project.findMany({
      where: { OR },
      select: { id: true, key: true, name: true },
      orderBy: { name: "asc" },
    });

    const stars = await prisma.star.findMany({ where: { userId }, select: { projectId: true } });
    const data = { projects, starredProjectIds: stars.map((s) => s.projectId) };

    await setCache(cacheKey, data, 300); // 5 minutes cache
    return data;
  } catch (err) {
    console.error("[getChromeData Recoverable Error]:", err);
    return { projects: [], starredProjectIds: [] };
  }
}
