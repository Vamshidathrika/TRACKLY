"use server";

import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseJQLToPrisma } from "@/lib/jql";
import { requireMembership } from "@/lib/tenant";

export async function executeJQLQueryAction(jql: string) {
  try {
    const { userId, siteId, role } = await requireMembership();
    if (!siteId) return [];

    let projectFilter: Record<string, any> = { project: { siteId } };
    if (role !== "ADMIN") {
      const userProjects = await prisma.projectMember.findMany({
        where: { userId },
        select: { projectId: true },
      });
      const leadProjects = await prisma.project.findMany({
        where: { siteId, leadId: userId },
        select: { id: true },
      });
      const allowedIds = Array.from(
        new Set([...userProjects.map((p) => p.projectId), ...leadProjects.map((p) => p.id)])
      );
      if (allowedIds.length === 0) return [];
      projectFilter = { projectId: { in: allowedIds }, project: { siteId } };
    }

    const whereClause = parseJQLToPrisma(jql);

    return await prisma.issue.findMany({
      where: {
        AND: [projectFilter, whereClause],
      },
      include: {
        project: { select: { key: true, name: true } },
        assignee: { select: { id: true, name: true, avatarUrl: true } },
        reporter: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });
  } catch {
    return [];
  }
}

export async function saveFilterAction(name: string, jql: string) {
  const user = await getAuthUser();
  try {
    const filter = await prisma.savedFilter.create({
      data: {
        userId: user.id,
        name,
        jql,
      },
    });
    revalidatePath("/filters/search");
    return { success: true, filter };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}

export async function getSavedFiltersAction() {
  const user = await getAuthUser();
  return prisma.savedFilter.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
}
