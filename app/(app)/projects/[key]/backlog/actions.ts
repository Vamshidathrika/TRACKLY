"use server";

import { revalidatePath } from "next/cache";
import { createSprint, updateSprint, startSprint, completeSprint, moveIssueToSprint } from "@/lib/sprints";
import { createIssue, updateIssue } from "@/lib/issues";
import { getAuthUser } from "@/lib/auth";
import { checkProjectAccess, checkProjectAdmin } from "@/lib/tenant";
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
    const user = await getAuthUser();
    const isAdmin = await checkProjectAdmin(user.id, projectId);
    if (!isAdmin) return { error: "Only board owners and workspace admins can create sprints" };

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
    const user = await getAuthUser();
    const existingSprint = await prisma.sprint.findUnique({
      where: { id: sprintId },
      select: { projectId: true },
    });
    if (!existingSprint) return { error: "Sprint not found" };

    const access = await checkProjectAccess(user.id, existingSprint.projectId);
    if (!access) return { error: "You don't have access to this project" };

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
    const user = await getAuthUser();
    const existingSprint = await prisma.sprint.findUnique({
      where: { id: sprintId },
      select: { projectId: true },
    });
    if (!existingSprint) return { error: "Sprint not found" };

    const isAdmin = await checkProjectAdmin(user.id, existingSprint.projectId);
    if (!isAdmin) return { error: "Only board owners and workspace admins can start sprints" };

    await startSprint(sprintId, { goal });
    revalidatePath("/projects");
    return { success: true };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}

export async function completeSprintAction(
  sprintId: string,
  options?: {
    destination?: "BACKLOG" | "NEXT_SPRINT" | "NEW_SPRINT";
    targetSprintId?: string;
    newSprintName?: string;
  }
) {
  try {
    const user = await getAuthUser();
    const existingSprint = await prisma.sprint.findUnique({
      where: { id: sprintId },
      select: { projectId: true },
    });
    if (!existingSprint) return { error: "Sprint not found" };

    const isAdmin = await checkProjectAdmin(user.id, existingSprint.projectId);
    if (!isAdmin) return { error: "Only board owners and workspace admins can complete sprints" };

    const result = await completeSprint(sprintId, options);
    revalidatePath("/projects");
    return { success: true, result };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}

export async function moveIssueToSprintAction(issueId: string, sprintId: string | null) {
  try {
    const user = await getAuthUser();
    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
      select: { projectId: true },
    });
    if (!issue) return { error: "Issue not found" };

    const access = await checkProjectAccess(user.id, issue.projectId);
    if (!access) return { error: "You don't have access to this project" };

    // The target sprint must belong to the SAME project as the issue — otherwise
    // proving access to the issue's project would be enough to dangle it into an
    // arbitrary sprint id from a different tenant's project.
    if (sprintId) {
      const targetSprint = await prisma.sprint.findUnique({
        where: { id: sprintId },
        select: { projectId: true },
      });
      if (!targetSprint || targetSprint.projectId !== issue.projectId) {
        return { error: "Sprint not found in this project" };
      }
    }

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
  const access = await checkProjectAccess(user.id, input.projectId);
  if (!access) return { error: "You don't have access to this project" };

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
    const issues = await prisma.issue.findMany({
      where: { id: { in: issueIds } },
      select: { projectId: true },
    });
    const projectIds = Array.from(new Set(issues.map((i) => i.projectId)));
    for (const issue of issues) {
      const access = await checkProjectAccess(user.id, issue.projectId);
      if (!access) return { error: "You don't have access to one or more selected issues" };
    }

    if (data.assigneeId) {
      for (const projectId of projectIds) {
        const isMember = await prisma.projectMember.findUnique({
          where: { projectId_userId: { projectId, userId: data.assigneeId } },
        });
        const proj = await prisma.project.findUnique({
          where: { id: projectId },
          select: { siteId: true },
        });
        const isWorkspaceAdmin = proj
          ? await prisma.membership.findFirst({
              where: { userId: data.assigneeId, siteId: proj.siteId, role: "ADMIN" },
            })
          : null;
        if (!isMember && !isWorkspaceAdmin) {
          return { error: "Assigned user is not a member of the target board" };
        }
      }
    }

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
  const user = await getAuthUser();
  if (issueIds.length === 0) return { success: true };

  try {
    const issues = await prisma.issue.findMany({
      where: { id: { in: issueIds } },
      select: { projectId: true },
    });
    for (const issue of issues) {
      const access = await checkProjectAccess(user.id, issue.projectId);
      if (!access) return { error: "You don't have access to one or more selected issues" };
    }

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
