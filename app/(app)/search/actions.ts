"use server";

import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function quickSearchAction(query: string) {
  const q = query.trim();
  if (!q) return { issues: [], projects: [] };

  const user = await getAuthUser();
  const membership = await prisma.membership.findFirst({ where: { userId: user.id } });
  const siteId = membership?.siteId ?? (await prisma.site.findFirst())?.id;
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
