"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createIssue } from "@/lib/issues";
import type { IssueType, IssuePriority, IssueStatus } from "@prisma/client";

const createIssueSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  summary: z.string().min(1, "Summary is required"),
  description: z.string().optional(),
  type: z.enum(["EPIC", "STORY", "TASK", "BUG", "SUBTASK"]).optional(),
  priority: z.enum(["HIGHEST", "HIGH", "MEDIUM", "LOW", "LOWEST"]).optional(),
  status: z.enum(["TO_DO", "IN_PROGRESS", "IN_REVIEW", "DONE"]).optional(),
  sprintId: z.string().optional(),
  storyPoints: z.coerce.number().optional(),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
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
      status: (parsed.data.status as IssueStatus) ?? "TO_DO",
      sprintId: parsed.data.sprintId || undefined,
      storyPoints: parsed.data.storyPoints,
      assigneeId: parsed.data.assigneeId || undefined,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined,
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

export async function createSubtaskAction(input: {
  parentIssueId: string;
  projectId: string;
  summary: string;
}) {
  const user = await getAuthUser();
  const subtask = await createIssue({
    projectId: input.projectId,
    summary: input.summary,
    type: "SUBTASK",
    parentId: input.parentIssueId,
    reporterId: user.id,
  });
  revalidatePath("/projects");
  return subtask;
}

export async function createIssueLinkAction(input: {
  sourceIssueId: string;
  targetIssueKey: string;
  relation: "RELATES_TO" | "BLOCKS" | "IS_BLOCKED_BY" | "DUPLICATES";
}) {
  const target = await prisma.issue.findFirst({
    where: { key: input.targetIssueKey.toUpperCase().trim() },
    select: { id: true },
  });
  if (!target) throw new Error(`Target issue ${input.targetIssueKey} not found.`);

  const link = await prisma.issueLink.create({
    data: {
      sourceIssueId: input.sourceIssueId,
      targetIssueId: target.id,
      relation: input.relation,
    },
  });
  revalidatePath("/projects");
  return link;
}

export async function deleteIssueLinkAction(linkId: string) {
  await getAuthUser();
  await prisma.issueLink.delete({ where: { id: linkId } });
  revalidatePath("/projects");
  return { success: true };
}

export async function logWorkAction(input: {
  issueId: string;
  hours: number;
  description?: string;
}) {
  const user = await getAuthUser();
  const log = await prisma.workLog.create({
    data: {
      issueId: input.issueId,
      authorId: user.id,
      hours: input.hours,
      description: input.description,
    },
  });
  revalidatePath("/projects");
  return log;
}

export async function uploadAttachmentAction(input: {
  issueId: string;
  filename: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
}) {
  const user = await getAuthUser();
  const attachment = await prisma.attachment.create({
    data: {
      issueId: input.issueId,
      uploaderId: user.id,
      filename: input.filename,
      url: input.url,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
    },
  });
  revalidatePath("/projects");
  return attachment;
}

export async function deleteAttachmentAction(attachmentId: string) {
  await getAuthUser();
  await prisma.attachment.delete({ where: { id: attachmentId } });
  revalidatePath("/projects");
  return { success: true };
}

