import { cache } from "react";
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
 * - Workspace ADMINs see ALL projects within their ADMIN workspace(s)
 * - Workspace MEMBERs see only projects they have explicit ProjectMember access to or lead
 */
export async function getProjectsForUser(siteId: string, userId: string) {
  const memberships = await prisma.membership.findMany({
    where: { userId },
    select: { siteId: true, role: true },
  });

  if (memberships.length === 0) return [];

  const siteIds = Array.from(new Set(memberships.map((m) => m.siteId).concat(siteId).filter(Boolean)));

  const projectInclude = {
    lead: { select: { id: true, name: true, email: true, avatarUrl: true } },
    _count: { select: { issues: true } },
  } as const;

  // Scope admin privileges specifically per site
  const adminSiteIds = memberships.filter((m) => m.role === "ADMIN").map((m) => m.siteId);
  const memberSiteIds = siteIds.filter((sId) => !adminSiteIds.includes(sId));

  const projectMembers = await prisma.projectMember.findMany({
    where: { userId },
    select: { projectId: true },
  });
  const allowedProjectIds = projectMembers.map((pm) => pm.projectId);

  const conditions = [];

  if (adminSiteIds.length > 0) {
    conditions.push({ siteId: { in: adminSiteIds } });
  }

  if (memberSiteIds.length > 0) {
    conditions.push({
      siteId: { in: memberSiteIds },
      OR: [
        { id: { in: allowedProjectIds } },
        { leadId: userId },
      ],
    });
  }

  if (conditions.length === 0) return [];

  return prisma.project.findMany({
    where: { OR: conditions },
    include: projectInclude,
    orderBy: { createdAt: "desc" },
  });
}


export async function updateProject(
  siteId: string,
  projectId: string,
  data: { name?: string; key?: string; type?: ProjectType; leadId?: string }
) {
  const existing = await prisma.project.findUnique({ where: { id: projectId } });
  if (!existing || existing.siteId !== siteId) throw new Error("PROJECT_NOT_FOUND");

  let newKey = existing.key;
  if (data.key && data.key.toUpperCase() !== existing.key) {
    newKey = data.key.toUpperCase();
    const keyTaken = await prisma.project.findFirst({
      where: { siteId, key: newKey, id: { not: projectId } },
    });
    if (keyTaken) throw new Error("KEY_TAKEN");
    data.key = newKey;
  }

  const updated = await prisma.project.update({
    where: { id: projectId },
    data,
  });

  if (data.leadId) {
    await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId, userId: data.leadId } },
      create: { projectId, userId: data.leadId, role: "ADMIN" },
      update: { role: "ADMIN" },
    });
  }

  await delCache(`site:projects:${siteId}`);
  await delCache(`site:project:${siteId}:${existing.key}`);
  if (data.key) {
    await delCache(`site:project:${siteId}:${data.key}`);
  }

  return updated;
}

export async function deleteProject(siteId: string, projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.siteId !== siteId) throw new Error("PROJECT_NOT_FOUND");

  // Clean up all related models explicitly so no dangling references remain in Starred or Recent lists
  await prisma.star?.deleteMany({ where: { projectId } }).catch(() => {});
  await prisma.projectMember?.deleteMany({ where: { projectId } }).catch(() => {});
  await prisma.customField?.deleteMany({ where: { projectId } }).catch(() => {});
  await prisma.automationRule?.deleteMany({ where: { projectId } }).catch(() => {});
  await prisma.sprint?.deleteMany({ where: { projectId } }).catch(() => {});
  await prisma.issue?.deleteMany({ where: { projectId } }).catch(() => {});
  await prisma.invite?.deleteMany({ where: { projectId } }).catch(() => {});
  await prisma.gitRepository?.deleteMany({ where: { projectId } }).catch(() => {});

  await prisma.project.delete({ where: { id: projectId } });

  await delCache(`site:projects:${siteId}`);
  await delCache(`site:project:${siteId}:${project.key}`);
  return { success: true, key: project.key };
}

export async function getProjectMembers(projectId: string) {
  return prisma.projectMember.findMany({
    where: { projectId },
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function addProjectMember(input: {
  projectId: string;
  userId: string;
  role?: "ADMIN" | "MEMBER" | "VIEWER";
}) {
  return prisma.projectMember.create({
    data: {
      projectId: input.projectId,
      userId: input.userId,
      role: input.role ?? "MEMBER",
    },
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true } },
    },
  });
}

export async function updateProjectMemberRole(
  projectId: string,
  userId: string,
  role: "ADMIN" | "MEMBER" | "VIEWER"
) {
  return prisma.projectMember.update({
    where: { projectId_userId: { projectId, userId } },
    data: { role },
  });
}

export async function removeProjectMember(projectId: string, userId: string) {
  await prisma.issue.updateMany({
    where: { projectId, assigneeId: userId },
    data: { assigneeId: null },
  });

  const res = await prisma.projectMember.delete({
    where: { projectId_userId: { projectId, userId } },
  });

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { siteId: true, key: true },
  });

  if (project) {
    await delCache(`site:projects:${project.siteId}`).catch(() => {});
    await delCache(`site:project:${project.siteId}:${project.key}`).catch(() => {});
    await delCache(`user:chrome:${userId}`).catch(() => {});
  }

  return res;
}

/**
 * Shared helper to resolve a project by key, case-insensitive name, or ID
 * across all site memberships of a given user.
 */
export const resolveProjectByKey = cache(async (userId: string, siteId: string, rawKey: string) => {
  const userMemberships = await prisma.membership.findMany({
    where: { userId },
    select: { siteId: true },
  });
  const siteIds = Array.from(new Set(userMemberships.map((m) => m.siteId).concat(siteId)));
  const upperKey = rawKey.toUpperCase();

  let project = await prisma.project.findFirst({
    where: {
      siteId: { in: siteIds },
      OR: [
        { key: upperKey },
        { name: { equals: rawKey, mode: "insensitive" } },
        { id: rawKey },
      ],
    },
    include: {
      lead: { select: { id: true, name: true, email: true, avatarUrl: true } },
    },
  });

  // Global fallback for shared board links: search globally across all projects
  // so users accessing a shared link seamlessly gain access and see it in their workspace
  if (!project) {
    project = await prisma.project.findFirst({
      where: {
        OR: [
          { key: upperKey },
          { name: { equals: rawKey, mode: "insensitive" } },
          { id: rawKey },
        ],
      },
      include: {
        lead: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });
  }

  return project;
});

