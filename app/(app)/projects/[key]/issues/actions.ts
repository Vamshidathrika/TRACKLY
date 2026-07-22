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
