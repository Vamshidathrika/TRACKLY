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
  description: z.preprocess((val) => (val === "" ? undefined : val), z.string().optional()),
  type: z.enum(["EPIC", "STORY", "TASK", "BUG", "SUBTASK"]).optional(),
  priority: z.enum(["HIGHEST", "HIGH", "MEDIUM", "LOW", "LOWEST"]).optional(),
  status: z.enum(["TO_DO", "IN_PROGRESS", "IN_REVIEW", "DONE"]).optional(),
  sprintId: z.preprocess((val) => (val === "" ? undefined : val), z.string().optional()),
  storyPoints: z.preprocess((val) => (val === "" || val === null || isNaN(Number(val)) ? undefined : val), z.coerce.number().optional()),
  originalEstimate: z.preprocess((val) => (val === "" || val === null || isNaN(Number(val)) ? undefined : val), z.coerce.number().optional()),
  assigneeId: z.preprocess((val) => (val === "" ? undefined : val), z.string().optional()),
  dueDate: z.preprocess((val) => (val === "" ? undefined : val), z.string().optional()),
});

export async function createIssueAction(
  _prev: { error?: string; success?: boolean },
  formData: FormData
) {
  const user = await getAuthUser();

  const parsed = createIssueSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // projectId comes straight from client FormData — verify project membership
  // before creating an issue in a workspace/project the caller can't access.
  const access = await checkProjectAccess(user.id, parsed.data.projectId);
  if (!access) return { error: "You do not have access to this project" };

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
      originalEstimate: parsed.data.originalEstimate,
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

import { requireMembership, checkProjectAccess } from "@/lib/tenant";
import { getProjectsForUser } from "@/lib/projects";

export async function fetchUserProjectsAction() {
  const { userId, siteId } = await requireMembership();
  const projects = await getProjectsForUser(siteId, userId);
  return projects.map((p) => ({ id: p.id, name: p.name, key: p.key }));
}

export async function fetchWorkspaceMembersAction() {
  const { siteId } = await requireMembership();

  return prisma.user.findMany({
    where: {
      memberships: {
        some: { siteId },
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

  // projectId is client-supplied — verify access before creating a subtask there.
  const access = await checkProjectAccess(user.id, input.projectId);
  if (!access) throw new Error("You do not have access to this project");

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
  const { siteId } = await requireMembership();

  const target = await prisma.issue.findFirst({
    where: {
      key: input.targetIssueKey.toUpperCase().trim(),
      project: { siteId },
    },
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
  const user = await getAuthUser();

  // Resolve the link's source issue and require project access — deleting by
  // raw id with no check would let any authenticated user remove a link on a
  // foreign tenant's issue.
  const link = await prisma.issueLink.findUnique({
    where: { id: linkId },
    select: { sourceIssue: { select: { projectId: true } } },
  });
  if (!link) return { error: "Link not found" };

  const access = await checkProjectAccess(user.id, link.sourceIssue.projectId);
  if (!access) return { error: "You do not have access to this issue" };

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
  const user = await getAuthUser();

  // Align with the stricter sibling in projects/[key]/issues/actions.ts: only
  // the uploader may delete their own attachment (deleting by raw id with no
  // check was the weaker rule the UI happened to reach).
  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
  });
  if (!attachment) return { error: "Attachment not found" };
  if (attachment.uploaderId !== user.id) {
    return { error: "You can only delete attachments you uploaded" };
  }

  await prisma.attachment.delete({ where: { id: attachmentId } });
  revalidatePath("/projects");
  return { success: true };
}

