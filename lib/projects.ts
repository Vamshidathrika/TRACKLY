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

  let match = await prisma.project.findFirst({
    where: { siteId, key: upperKey },
    include: {
      lead: { select: { id: true, name: true, email: true, avatarUrl: true } },
    },
  });
  if (!match) {
    match = await prisma.project.findFirst({
      where: { key: upperKey },
      include: {
        lead: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });
  }

  if (match) {
    await setCache(cacheKey, match, 300); // 5 minutes cache
  }
  return match;
}
