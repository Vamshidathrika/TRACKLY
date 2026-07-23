"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createIssue } from "@/lib/issues";
import type { IssueType, IssuePriority } from "@prisma/client";

const createIssueSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  summary: z.string().min(1, "Summary is required"),
  description: z.string().optional(),
  type: z.enum(["EPIC", "STORY", "TASK", "BUG", "SUBTASK"]).optional(),
  priority: z.enum(["HIGHEST", "HIGH", "MEDIUM", "LOW", "LOWEST"]).optional(),
  storyPoints: z.coerce.number().optional(),
  assigneeId: z.string().optional(),
});

export async function createIssueAction(
  _prev: { error?: string; success?: boolean },
  formData: FormData
) {
  const user = await getAuthUser();

  const parsed = createIssueSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    await createIssue({
      projectId: parsed.data.projectId,
      summary: parsed.data.summary,
      description: parsed.data.description,
      type: (parsed.data.type as IssueType) ?? "STORY",
      priority: (parsed.data.priority as IssuePriority) ?? "MEDIUM",
      storyPoints: parsed.data.storyPoints,
      assigneeId: parsed.data.assigneeId || undefined,
      reporterId: user.id,
    });
    revalidatePath("/projects");
    return { success: true };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}

export async function fetchUserProjectsAction() {
  const user = await getAuthUser();
  return prisma.project.findMany({
    where: {
      site: {
        memberships: {
          some: { userId: user.id },
        },
      },
    },
    select: { id: true, name: true, key: true },
    orderBy: { name: "asc" },
  });
}

export async function fetchWorkspaceMembersAction() {
  const user = await getAuthUser();
  const userMemberships = await prisma.membership.findMany({
    where: { userId: user.id },
    select: { siteId: true },
  });
  const siteIds = userMemberships.map((m) => m.siteId);
  if (siteIds.length === 0) return [];

  return prisma.user.findMany({
    where: {
      memberships: {
        some: { siteId: { in: siteIds } },
      },
    },
    select: { id: true, name: true, email: true, avatarUrl: true },
    orderBy: { name: "asc" },
  });
}
