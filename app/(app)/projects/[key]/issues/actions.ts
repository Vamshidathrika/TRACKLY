"use server";

import { revalidatePath } from "next/cache";
import { put, del } from "@vercel/blob";
import { getAuthUser } from "@/lib/auth";
import { updateIssue, addComment, deleteIssue, deleteComment } from "@/lib/issues";
import { extractMentions, createNotification, toggleWatcher } from "@/lib/notifications";
import { evaluateAutomationTriggers } from "@/lib/automation";
import { prisma } from "@/lib/prisma";
import type { IssueStatus, IssuePriority, IssueType, LinkRelation } from "@prisma/client";

export async function updateIssueFieldAction(
  issueId: string,
  field:
    | "status"
    | "priority"
    | "type"
    | "summary"
    | "description"
    | "storyPoints"
    | "assigneeId"
    | "reporterId"
    | "sprintId"
    | "startDate"
    | "dueDate"
    | "labels",
  value: string | number | null
) {
  const user = await getAuthUser();

  try {
    const data: Record<string, any> = {};
    const strVal = value !== null ? String(value) : "";
    if (field === "status") data.status = value as IssueStatus;
    if (field === "priority") data.priority = value as IssuePriority;
    if (field === "type") data.type = value as IssueType;
    if (field === "summary") data.summary = strVal;
    if (field === "description") data.description = strVal;
    if (field === "storyPoints") data.storyPoints = value !== null && value !== "" ? Number(value) : null;
    if (field === "assigneeId") data.assigneeId = strVal || null;
    if (field === "reporterId") data.reporterId = strVal || null;
    if (field === "sprintId") data.sprintId = strVal || null;
    if (field === "startDate") data.startDate = strVal ? new Date(strVal) : null;
    if (field === "dueDate") data.dueDate = strVal ? new Date(strVal) : null;
    if (field === "labels") {
      data.labels = strVal
        .split(",")
        .map((l: string) => l.trim())
        .filter(Boolean);
    }

    await updateIssue(issueId, user.id, data);

    // Notify watchers and trigger automation rules if status changed
    if (field === "assigneeId" && strVal) {
      const issue = await prisma.issue.findUnique({
        where: { id: issueId },
        include: { project: true },
      });
      if (issue && strVal !== user.id) {
        await createNotification({
          userId: strVal,
          actorId: user.id,
          type: "ASSIGNMENT",
          title: `Assigned to ${issue.key}`,
          message: `${user.name ?? "A teammate"} assigned ${issue.key} to you`,
          link: `/projects/${issue.project.key}/issues/${issue.key}`,
        });
      }
    }

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
      // Notify assignee & reporter if not self
      const notifyUsers = new Set<string>();
      if (issue.assigneeId && issue.assigneeId !== user.id) notifyUsers.add(issue.assigneeId);
      if (issue.reporterId && issue.reporterId !== user.id) notifyUsers.add(issue.reporterId);

      for (const recipientId of notifyUsers) {
        await createNotification({
          userId: recipientId,
          actorId: user.id,
          type: "COMMENT",
          title: `New comment on ${issue.key}`,
          message: `${user.name ?? "Teammate"}: "${body.slice(0, 50)}..."`,
          link: `/projects/${issue.project.key}/issues/${issue.key}`,
        });
      }

      // Check for @mentions
      const mentionNames = extractMentions(body);
      for (const name of mentionNames) {
        const mentionedUser = await prisma.user.findFirst({
          where: { name: { contains: name, mode: "insensitive" } },
        });
        if (mentionedUser && mentionedUser.id !== user.id) {
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

    // number/key are unique per project and derived from the current max, so two
    // concurrent creates can pick the same number. Retry on the resulting unique
    // violation rather than surfacing a crash to whoever lost the race.
    for (let attempt = 0; attempt < 5; attempt++) {
      const last = await prisma.issue.findFirst({
        where: { projectId: parent.projectId },
        orderBy: { number: "desc" },
        select: { number: true },
      });
      const number = (last?.number ?? 0) + 1;

      try {
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
        break;
      } catch (e: any) {
        // P2002 = unique constraint violation; anything else is a real failure.
        if (e?.code !== "P2002") throw e;
        if (attempt === 4) return { error: "Could not allocate a ticket number. Try again." };
      }
    }

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
  const user = await getAuthUser();
  const userMemberships = await prisma.membership.findMany({
    where: { userId: user.id },
    select: { siteId: true },
  });
  const siteIds = userMemberships.map((m) => m.siteId);

  try {
    const source = await prisma.issue.findUnique({
      where: { id: sourceIssueId },
      include: { project: true },
    });
    if (!source) return { error: "This ticket is not persisted yet, so links cannot be added." };

    const target = await prisma.issue.findFirst({
      where: {
        key: targetKey.trim().toUpperCase(),
        project: { siteId: { in: siteIds } },
      },
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

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return { error: "File storage is not configured. Set BLOB_READ_WRITE_TOKEN." };
    }

    for (const file of files) {
      if (file.size === 0) continue;
      if (file.size > MAX_ATTACHMENT_BYTES) {
        return { error: `${file.name} is larger than the 10 MB limit` };
      }

      // Blob storage, not local disk: serverless filesystems are read-only
      // and wiped between invocations. addRandomSuffix keeps two uploads of
      // the same filename from overwriting each other.
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const blob = await put(`attachments/${issueId}/${safeName}`, file, {
        access: "public",
        addRandomSuffix: true,
      });

      await prisma.attachment.create({
        data: {
          issueId,
          uploaderId: user.id,
          filename: file.name,
          url: blob.url,
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
    // Best-effort blob cleanup: an already-deleted blob must not fail the request.
    await del(attachment.url).catch(() => {});

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

export async function deleteIssueAction(issueId: string) {
  const user = await getAuthUser();
  try {
    const res = await deleteIssue(issueId, user.id);
    revalidatePath(`/projects/${res.projectKey}`);
    revalidatePath("/projects");
    revalidatePath("/dashboards");
    return res;
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}

export async function deleteCommentAction(commentId: string) {
  const user = await getAuthUser();
  try {
    const res = await deleteComment(commentId, user.id);
    revalidatePath("/projects");
    return res;
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}
