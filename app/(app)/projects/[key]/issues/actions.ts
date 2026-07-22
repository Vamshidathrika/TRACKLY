"use server";

import { revalidatePath } from "next/cache";
import { mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { getAuthUser } from "@/lib/auth";
import { updateIssue, addComment } from "@/lib/issues";
import { extractMentions, createNotification, toggleWatcher } from "@/lib/notifications";
import { evaluateAutomationTriggers } from "@/lib/automation";
import { prisma } from "@/lib/prisma";
import type { IssueStatus, IssuePriority, LinkRelation } from "@prisma/client";

export async function updateIssueFieldAction(
  issueId: string,
  field:
    | "status"
    | "priority"
    | "summary"
    | "description"
    | "storyPoints"
    | "assigneeId"
    | "sprintId"
    | "startDate"
    | "dueDate"
    | "labels",
  value: string
) {
  const user = await getAuthUser();

  try {
    let data: Record<string, any> = {};
    if (field === "status") data.status = value as IssueStatus;
    if (field === "priority") data.priority = value as IssuePriority;
    if (field === "summary") data.summary = value;
    if (field === "description") data.description = value;
    if (field === "storyPoints") data.storyPoints = value ? parseFloat(value) : null;
    if (field === "assigneeId") data.assigneeId = value || null;
    if (field === "sprintId") data.sprintId = value || null;
    if (field === "startDate") data.startDate = value ? new Date(value) : null;
    if (field === "dueDate") data.dueDate = value ? new Date(value) : null;
    if (field === "labels") {
      data.labels = value
        .split(",")
        .map((l) => l.trim())
        .filter(Boolean);
    }

    await updateIssue(issueId, user.id, data);

    // Notify watchers and trigger automation rules if status changed
    if (field === "status") {
      const issue = await prisma.issue.findUnique({
        where: { id: issueId },
        include: { watchers: true, project: true },
      });
      if (issue) {
        for (const w of issue.watchers) {
          await createNotification({
            userId: w.userId,
            actorId: user.id,
            type: "STATUS_CHANGE",
            title: `Status changed to ${value}`,
            message: `${user.name} changed status of ${issue.key} to ${value}`,
            link: `/projects/${issue.project.key}/issues/${issue.key}`,
          });
        }

        await evaluateAutomationTriggers("STATUS_CHANGED", {
          issueId: issue.id,
          projectId: issue.projectId,
          authorId: user.id,
        });
      }
    }

    revalidatePath("/projects");
    return { success: true };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}

export async function postCommentAction(issueId: string, body: string) {
  const user = await getAuthUser();
  if (!body.trim()) return { error: "Comment cannot be empty" };

  try {
    await addComment({ issueId, authorId: user.id, body });
    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
      include: { project: true },
    });

    if (issue) {
      // Check for @mentions
      const mentionNames = extractMentions(body);
      for (const name of mentionNames) {
        const mentionedUser = await prisma.user.findFirst({
          where: { name: { contains: name, mode: "insensitive" } },
        });
        if (mentionedUser) {
          await createNotification({
            userId: mentionedUser.id,
            actorId: user.id,
            type: "MENTION",
            title: `Mentioned on ${issue.key}`,
            message: `${user.name} mentioned you: "${body.slice(0, 50)}..."`,
            link: `/projects/${issue.project.key}/issues/${issue.key}`,
          });
        }
      }

      await evaluateAutomationTriggers("COMMENT_ADDED", {
        issueId: issue.id,
        projectId: issue.projectId,
        authorId: user.id,
      });
    }

    revalidatePath("/projects");
    return { success: true };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}

export async function logWorkAction(
  issueId: string,
  hours: number,
  description: string,
  startedAt?: string
) {
  const user = await getAuthUser();

  if (!Number.isFinite(hours) || hours <= 0) return { error: "Time spent must be greater than 0" };
  if (hours > 24 * 30) return { error: "Time spent is unrealistically large" };

  try {
    // Mock/unseeded issues have synthetic ids and no database row to attach to.
    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
      include: { project: true, watchers: true },
    });
    if (!issue) return { error: "This ticket is not persisted yet, so work cannot be logged." };

    const log = await prisma.workLog.create({
      data: {
        issueId,
        authorId: user.id,
        hours,
        description: description.trim() || null,
        startedAt: startedAt ? new Date(startedAt) : new Date(),
      },
      include: { author: { select: { id: true, name: true, avatarUrl: true } } },
    });

    for (const w of issue.watchers) {
      if (w.userId === user.id) continue;
      await createNotification({
        userId: w.userId,
        actorId: user.id,
        type: "STATUS_CHANGE",
        title: `Work logged on ${issue.key}`,
        message: `${user.name} logged ${hours}h on ${issue.key}`,
        link: `/projects/${issue.project.key}/issues/${issue.key}`,
      });
    }

    revalidatePath(`/projects/${issue.project.key}/issues/${issue.key}`);
    revalidatePath("/projects");
    return { success: true, log };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}

export async function deleteWorkLogAction(workLogId: string) {
  const user = await getAuthUser();
  try {
    const log = await prisma.workLog.findUnique({
      where: { id: workLogId },
      include: { issue: { include: { project: true } } },
    });
    if (!log) return { error: "Work log not found" };
    if (log.authorId !== user.id) return { error: "You can only delete your own work logs" };

    await prisma.workLog.delete({ where: { id: workLogId } });

    revalidatePath(`/projects/${log.issue.project.key}/issues/${log.issue.key}`);
    return { success: true };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Subtasks (modelled as child Issues via Issue.parentId)
// ---------------------------------------------------------------------------

export async function createSubtaskAction(parentIssueId: string, title: string) {
  const user = await getAuthUser();
  if (!title.trim()) return { error: "Subtask title cannot be empty" };

  try {
    const parent = await prisma.issue.findUnique({
      where: { id: parentIssueId },
      include: { project: true },
    });
    if (!parent) return { error: "This ticket is not persisted yet, so subtasks cannot be added." };

    // key/number are unique per project, so derive the next number from the max.
    const last = await prisma.issue.findFirst({
      where: { projectId: parent.projectId },
      orderBy: { number: "desc" },
      select: { number: true },
    });
    const number = (last?.number ?? 0) + 1;

    await prisma.issue.create({
      data: {
        projectId: parent.projectId,
        parentId: parent.id,
        number,
        key: `${parent.project.key}-${number}`,
        summary: title.trim(),
        type: "SUBTASK",
        status: "TO_DO",
        priority: parent.priority,
        reporterId: user.id,
        assigneeId: parent.assigneeId,
      },
    });

    revalidatePath(`/projects/${parent.project.key}/issues/${parent.key}`);
    return { success: true };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}

export async function toggleSubtaskAction(subtaskId: string) {
  const user = await getAuthUser();
  try {
    const subtask = await prisma.issue.findUnique({
      where: { id: subtaskId },
      include: { project: true, parent: true },
    });
    if (!subtask) return { error: "Subtask not found" };

    const nextStatus = subtask.status === "DONE" ? "TO_DO" : "DONE";
    // Bypass updateIssue's assignee-only status rule: ticking your own checklist
    // item should not require being the assignee of the subtask.
    await prisma.issue.update({ where: { id: subtaskId }, data: { status: nextStatus } });
    await prisma.issueHistory.create({
      data: {
        issueId: subtaskId,
        authorId: user.id,
        field: "status",
        oldValue: subtask.status,
        newValue: nextStatus,
      },
    });

    if (subtask.parent) {
      revalidatePath(`/projects/${subtask.project.key}/issues/${subtask.parent.key}`);
    }
    return { success: true };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}

export async function deleteSubtaskAction(subtaskId: string) {
  await getAuthUser();
  try {
    const subtask = await prisma.issue.findUnique({
      where: { id: subtaskId },
      include: { project: true, parent: true },
    });
    if (!subtask) return { error: "Subtask not found" };
    if (!subtask.parentId) return { error: "This ticket is not a subtask" };

    await prisma.issue.delete({ where: { id: subtaskId } });

    if (subtask.parent) {
      revalidatePath(`/projects/${subtask.project.key}/issues/${subtask.parent.key}`);
    }
    return { success: true };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Linked work items
// ---------------------------------------------------------------------------

export async function linkIssueAction(
  sourceIssueId: string,
  targetKey: string,
  relation: LinkRelation
) {
  await getAuthUser();
  try {
    const source = await prisma.issue.findUnique({
      where: { id: sourceIssueId },
      include: { project: true },
    });
    if (!source) return { error: "This ticket is not persisted yet, so links cannot be added." };

    const target = await prisma.issue.findFirst({
      where: { key: targetKey.trim().toUpperCase() },
    });
    if (!target) return { error: `No ticket found with key ${targetKey.trim().toUpperCase()}` };
    if (target.id === source.id) return { error: "A ticket cannot be linked to itself" };

    const existing = await prisma.issueLink.findFirst({
      where: { sourceIssueId: source.id, targetIssueId: target.id, relation },
    });
    if (existing) return { error: "That link already exists" };

    await prisma.issueLink.create({
      data: { sourceIssueId: source.id, targetIssueId: target.id, relation },
    });

    revalidatePath(`/projects/${source.project.key}/issues/${source.key}`);
    return { success: true };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}

export async function unlinkIssueAction(linkId: string) {
  await getAuthUser();
  try {
    const link = await prisma.issueLink.findUnique({
      where: { id: linkId },
      include: { sourceIssue: { include: { project: true } } },
    });
    if (!link) return { error: "Link not found" };

    await prisma.issueLink.delete({ where: { id: linkId } });

    revalidatePath(
      `/projects/${link.sourceIssue.project.key}/issues/${link.sourceIssue.key}`
    );
    return { success: true };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Attachments
// ---------------------------------------------------------------------------

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export async function uploadAttachmentAction(issueId: string, formData: FormData) {
  const user = await getAuthUser();

  try {
    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
      include: { project: true },
    });
    if (!issue) return { error: "This ticket is not persisted yet, so files cannot be attached." };

    const files = formData.getAll("files").filter((f): f is File => f instanceof File);
    if (files.length === 0) return { error: "No files provided" };

    const uploadDir = path.join(process.cwd(), "public", "uploads", issueId);
    await mkdir(uploadDir, { recursive: true });

    for (const file of files) {
      if (file.size === 0) continue;
      if (file.size > MAX_ATTACHMENT_BYTES) {
        return { error: `${file.name} is larger than the 10 MB limit` };
      }

      // Prefix with a random id so two uploads of the same filename don't collide.
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storedName = `${randomUUID()}-${safeName}`;
      const bytes = Buffer.from(await file.arrayBuffer());
      await writeFile(path.join(uploadDir, storedName), bytes);

      await prisma.attachment.create({
        data: {
          issueId,
          uploaderId: user.id,
          filename: file.name,
          url: `/uploads/${issueId}/${storedName}`,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
        },
      });
    }

    revalidatePath(`/projects/${issue.project.key}/issues/${issue.key}`);
    return { success: true };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}

export async function deleteAttachmentAction(attachmentId: string) {
  const user = await getAuthUser();
  try {
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: { issue: { include: { project: true } } },
    });
    if (!attachment) return { error: "Attachment not found" };
    if (attachment.uploaderId !== user.id) {
      return { error: "You can only delete attachments you uploaded" };
    }

    await prisma.attachment.delete({ where: { id: attachmentId } });
    // Remove the file too, but a missing file on disk must not fail the request.
    await rm(path.join(process.cwd(), "public", attachment.url), { force: true }).catch(() => {});

    revalidatePath(
      `/projects/${attachment.issue.project.key}/issues/${attachment.issue.key}`
    );
    return { success: true };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}

export async function toggleWatcherAction(issueId: string) {
  const user = await getAuthUser();
  try {
    const isWatching = await toggleWatcher(issueId, user.id);
    revalidatePath("/projects");
    return { success: true, isWatching };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}
