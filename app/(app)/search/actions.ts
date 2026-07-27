"use server";

import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/tenant";
import { getProjectsForUser } from "@/lib/projects";

export async function quickSearchAction(query: string) {
  const q = query.trim();
  if (!q) return { issues: [], projects: [] };

  const { userId, siteId } = await requireMembership();
  if (!siteId) return { issues: [], projects: [] };

  const userProjects = await getProjectsForUser(siteId, userId);
  const authorizedProjectIds = userProjects.map((p) => p.id);
  if (authorizedProjectIds.length === 0) return { issues: [], projects: [] };

  const [issues, projects] = await Promise.all([
    prisma.issue.findMany({
      where: {
        projectId: { in: authorizedProjectIds },
        OR: [
          { summary: { contains: q, mode: "insensitive" } },
          { key: { contains: q, mode: "insensitive" } },
        ],
      },
      include: { project: true },
      take: 6,
    }),
    prisma.project.findMany({
      where: {
        id: { in: authorizedProjectIds },
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { key: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 4,
    }),
  ]);

  return { issues, projects };
}
