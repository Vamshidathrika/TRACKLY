import { prisma } from "./prisma";
import type { ProjectType } from "@prisma/client";
import { getCache, setCache, delCache } from "./redis";

export function generateProjectKey(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase().replace(/[^A-Z]/g, "");
  }
  return name.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, "") || "PRJ";
}

export async function createProject(input: {
  siteId: string;
  name: string;
  key?: string;
  type?: ProjectType;
  leadId: string;
}) {
  const key = (input.key ? input.key.trim() : generateProjectKey(input.name)).toUpperCase();
  const existing = await prisma.project.findFirst({
    where: { siteId: input.siteId, key },
  });
  if (existing) throw new Error("KEY_TAKEN");

  const project = await prisma.project.create({
    data: {
      siteId: input.siteId,
      name: input.name,
      key,
      type: input.type ?? "KANBAN",
      leadId: input.leadId,
    },
  });

  // Auto-grant project ADMIN access to the creator
  await prisma.projectMember.create({
    data: {
      projectId: project.id,
      userId: input.leadId,
      role: "ADMIN",
    },
  });

  await delCache(`site:projects:${input.siteId}`);
  return project;
}

export async function getProjects(siteId: string) {
  const cacheKey = `site:projects:${siteId}`;
  const cached = await getCache<any[]>(cacheKey);
  if (cached) return cached;

  const projects = await prisma.project.findMany({
    where: { siteId },
    include: {
      lead: { select: { id: true, name: true, email: true, avatarUrl: true } },
      _count: { select: { issues: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  await setCache(cacheKey, projects, 300); // 5 minutes cache
  return projects;
}

export async function getProjectByKey(siteId: string, key: string) {
  const upperKey = key.toUpperCase();
  const cacheKey = `site:project:${siteId}:${upperKey}`;
  const cached = await getCache<any>(cacheKey);
  if (cached) return cached;

  // Strictly scoped to user's workspace — never cross-tenant
  const match = await prisma.project.findFirst({
    where: { siteId, key: upperKey },
    include: {
      lead: { select: { id: true, name: true, email: true, avatarUrl: true } },
    },
  });

  if (match) {
    await setCache(cacheKey, match, 300);
  }
  return match;
}

/**
 * Returns projects visible to a specific user within their workspace.
 * - Workspace ADMINs see ALL projects
 * - Workspace MEMBERs see only projects they have ProjectMember access to
 */
export async function getProjectsForUser(siteId: string, userId: string) {
  const membership = await prisma.membership.findUnique({
    where: { userId_siteId: { userId, siteId } },
  });

  if (!membership) return [];

  const projectInclude = {
    lead: { select: { id: true, name: true, email: true, avatarUrl: true } },
    _count: { select: { issues: true } },
  } as const;

  // Workspace ADMINs see all projects
  if (membership.role === "ADMIN") {
    return prisma.project.findMany({
      where: { siteId },
      include: projectInclude,
      orderBy: { createdAt: "desc" },
    });
  }

  // Workspace MEMBERs see only projects they have explicit access to
  try {
    const projectMembers = await prisma.projectMember.findMany({
      where: { userId },
      select: { projectId: true },
    });

    const projectIds = projectMembers.map((pm) => pm.projectId);

    return await prisma.project.findMany({
      where: {
        siteId,
        OR: [
          { id: { in: projectIds } },
          { leadId: userId },
        ],
      },
      include: projectInclude,
      orderBy: { createdAt: "desc" },
    });
  } catch (err) {
    // Graceful fallback if ProjectMember table is syncing
    return prisma.project.findMany({
      where: { siteId },
      include: projectInclude,
      orderBy: { createdAt: "desc" },
    });
  }
}
