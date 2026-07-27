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

export async function getChromeData(userId: string, siteId?: string) {
  try {
    const cacheKey = siteId ? `user:chrome:${userId}:${siteId}` : `user:chrome:${userId}`;
    const cached = await getCache<{ projects: { id: string; key: string; name: string }[]; starredProjectIds: string[] }>(cacheKey);
    if (cached) return cached;

    let targetSiteId = siteId;
    let targetRole: string | undefined;

    if (targetSiteId) {
      const membership = await prisma.membership.findUnique({
        where: { userId_siteId: { userId, siteId: targetSiteId } },
        select: { role: true },
      });
      targetRole = membership?.role;
    }

    if (!targetSiteId || !targetRole) {
      const primaryMembership = await prisma.membership.findFirst({
        where: { userId },
        select: { siteId: true, role: true },
        orderBy: { createdAt: "asc" },
      });
      if (!primaryMembership) return { projects: [], starredProjectIds: [] };
      targetSiteId = primaryMembership.siteId;
      targetRole = primaryMembership.role;
    }

    let projects: { id: string; key: string; name: string }[] = [];

    if (targetRole === "ADMIN") {
      // Workspace ADMINs see all projects in this workspace
      projects = await prisma.project.findMany({
        where: { siteId: targetSiteId },
        select: { id: true, key: true, name: true },
        orderBy: { name: "asc" },
      });
    } else {
      // Workspace MEMBERs see ONLY explicitly joined projects or led projects in this workspace
      const projectMembers = await prisma.projectMember.findMany({
        where: { userId },
        select: { projectId: true },
      });
      const projectIds = projectMembers.map((pm) => pm.projectId);

      projects = await prisma.project.findMany({
        where: {
          siteId: targetSiteId,
          OR: [
            { id: { in: projectIds } },
            { leadId: userId },
          ],
        },
        select: { id: true, key: true, name: true },
        orderBy: { name: "asc" },
      });
    }

    const stars = await prisma.star.findMany({ where: { userId }, select: { projectId: true } });
    const data = { projects, starredProjectIds: stars.map((s) => s.projectId) };

    await setCache(cacheKey, data, 300); // 5 minutes cache
    return data;
  } catch (err) {
    console.error("[getChromeData Recoverable Error]:", err);
    return { projects: [], starredProjectIds: [] };
  }
}
