"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { updateIssue, addComment } from "@/lib/issues";
import type { IssueStatus, IssuePriority } from "@prisma/client";

export async function updateIssueFieldAction(
  issueId: string,
  field: "status" | "priority" | "summary" | "description" | "storyPoints",
  value: string
) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return { error: "Not authenticated" };

  try {
    let data: Record<string, any> = {};
    if (field === "status") data.status = value as IssueStatus;
    if (field === "priority") data.priority = value as IssuePriority;
    if (field === "summary") data.summary = value;
    if (field === "description") data.description = value;
    if (field === "storyPoints") data.storyPoints = value ? parseFloat(value) : null;

    await updateIssue(issueId, userId, data);
    revalidatePath("/projects");
    return { success: true };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}

export async function postCommentAction(issueId: string, body: string) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return { error: "Not authenticated" };

  if (!body.trim()) return { error: "Comment cannot be empty" };

  try {
    await addComment({ issueId, authorId: userId, body });
    revalidatePath("/projects");
    return { success: true };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}
