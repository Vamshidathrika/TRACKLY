import { prisma } from "./prisma";
import type { ProjectType } from "@prisma/client";

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

  return prisma.project.create({
    data: {
      siteId: input.siteId,
      name: input.name,
      key,
      type: input.type ?? "KANBAN",
      leadId: input.leadId,
    },
  });
}

export async function getProjects(siteId: string) {
  return prisma.project.findMany({
    where: { siteId },
    include: {
      lead: { select: { id: true, name: true, email: true, avatarUrl: true } },
      _count: { select: { issues: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getProjectByKey(siteId: string, key: string) {
  const match = await prisma.project.findFirst({
    where: { siteId, key: key.toUpperCase() },
    include: {
      lead: { select: { id: true, name: true, email: true, avatarUrl: true } },
    },
  });
  if (match) return match;

  return prisma.project.findFirst({
    where: { key: key.toUpperCase() },
    include: {
      lead: { select: { id: true, name: true, email: true, avatarUrl: true } },
    },
  });
}
