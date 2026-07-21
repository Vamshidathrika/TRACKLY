"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
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
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return { error: "Not authenticated" };

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
      reporterId: userId,
    });
    revalidatePath("/projects");
    return { success: true };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}

export async function fetchUserProjectsAction() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return [];
  const membership = await prisma.membership.findFirst({ where: { userId } });
  if (!membership) return [];
  return prisma.project.findMany({
    where: { siteId: membership.siteId },
    select: { id: true, name: true, key: true },
    orderBy: { name: "asc" },
  });
}
