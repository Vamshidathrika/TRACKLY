"use server";

import { revalidatePath } from "next/cache";
import { createSprint, updateSprint, startSprint, completeSprint, moveIssueToSprint } from "@/lib/sprints";
import { createIssue, updateIssue } from "@/lib/issues";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { IssueStatus, IssuePriority, IssueType } from "@prisma/client";

export async function createSprintAction(
  projectId: string,
  name: string,
  goal?: string,
  startDate?: string,
  endDate?: string
) {
  try {
    const sprint = await createSprint({
      projectId,
      name,
      goal,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
    revalidatePath("/projects");
    return { success: true, sprint: { ...sprint, issues: [] } };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}

export async function updateSprintAction(
  sprintId: string,
  data: { name?: string; goal?: string; startDate?: string; endDate?: string }
) {
  try {
    const sprint = await updateSprint(sprintId, {
      name: data.name,
      goal: data.goal,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
    });
    revalidatePath("/projects");
    return { success: true, sprint };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}

export async function startSprintAction(sprintId: string, goal?: string) {
  try {
    await startSprint(sprintId, { goal });
    revalidatePath("/projects");
    return { success: true };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}

export async function completeSprintAction(sprintId: string) {
  try {
    await completeSprint(sprintId);
    revalidatePath("/projects");
    return { success: true };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}

export async function moveIssueToSprintAction(issueId: string, sprintId: string | null) {
  try {
    await moveIssueToSprint(issueId, sprintId);
    revalidatePath("/projects");
    return { success: true };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}

export async function quickCreateIssueAction(input: {
  projectId: string;
  summary: string;
  sprintId?: string | null;
  status?: IssueStatus;
  type?: IssueType;
}) {
  const user = await getAuthUser();
  if (!input.summary.trim()) return { error: "Summary required" };

  try {
    const issue = await createIssue({
      projectId: input.projectId,
      summary: input.summary.trim(),
      reporterId: user.id,
      sprintId: input.sprintId || undefined,
      status: input.status ?? "TO_DO",
      type: input.type ?? "TASK",
    });

    revalidatePath("/projects");
    return {
      success: true,
      issue: {
        ...issue,
        assignee: null,
        reporter: { id: user.id, name: user.name ?? user.email, avatarUrl: user.image ?? null },
      },
    };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}

export async function bulkUpdateIssuesAction(
  issueIds: string[],
  data: {
    status?: IssueStatus;
    priority?: IssuePriority;
    assigneeId?: string | null;
    sprintId?: string | null;
  }
) {
  const user = await getAuthUser();
  if (issueIds.length === 0) return { success: true };

  try {
    await prisma.issue.updateMany({
      where: { id: { in: issueIds } },
      data: data as any,
    });
    revalidatePath("/projects");
    return { success: true };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}

export async function bulkDeleteIssuesAction(issueIds: string[]) {
  await getAuthUser();
  if (issueIds.length === 0) return { success: true };

  try {
    await prisma.issue.deleteMany({
      where: { id: { in: issueIds } },
    });
    revalidatePath("/projects");
    return { success: true };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}
