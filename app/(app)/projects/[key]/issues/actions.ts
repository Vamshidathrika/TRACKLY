"use server";

import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth";
import { updateIssue, addComment } from "@/lib/issues";
import type { IssueStatus, IssuePriority } from "@prisma/client";

export async function updateIssueFieldAction(
  issueId: string,
  field: "status" | "priority" | "summary" | "description" | "storyPoints",
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

    await updateIssue(issueId, user.id, data);
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
    revalidatePath("/projects");
    return { success: true };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}
