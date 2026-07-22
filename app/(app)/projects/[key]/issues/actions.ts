"use server";

import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth";
import { updateIssue, addComment } from "@/lib/issues";
import { extractMentions, createNotification, toggleWatcher } from "@/lib/notifications";
import { evaluateAutomationTriggers } from "@/lib/automation";
import { prisma } from "@/lib/prisma";
import type { IssueStatus, IssuePriority } from "@prisma/client";

export async function updateIssueFieldAction(
  issueId: string,
  field: "status" | "priority" | "summary" | "description" | "storyPoints" | "assigneeId",
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
