"use server";

import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/tenant";

export async function quickSearchAction(query: string) {
  const q = query.trim();
  if (!q) return { issues: [], projects: [] };

  const { userId, siteId } = await requireMembership();
  if (!siteId) return { issues: [], projects: [] };

  const [issues, projects] = await Promise.all([
    prisma.issue.findMany({
      where: {
        project: { siteId },
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
        siteId,
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
