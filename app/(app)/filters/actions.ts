"use server";

import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseJQLToPrisma } from "@/lib/jql";

export async function executeJQLQueryAction(jql: string) {
  const user = await getAuthUser();
  const membership = await prisma.membership.findFirst({ where: { userId: user.id } });
  const siteId = membership?.siteId ?? (await prisma.site.findFirst())?.id;
  if (!siteId) return [];

  const whereClause = parseJQLToPrisma(jql);

  return prisma.issue.findMany({
    where: {
      project: { siteId },
      ...whereClause,
    },
    include: {
      project: { select: { key: true, name: true } },
      assignee: { select: { id: true, name: true, avatarUrl: true } },
      reporter: { select: { id: true, name: true, avatarUrl: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
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
