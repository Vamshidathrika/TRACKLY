"use server";

import { revalidatePath } from "next/cache";
import { createSprint, startSprint, completeSprint, moveIssueToSprint } from "@/lib/sprints";

export async function createSprintAction(projectId: string, name: string, goal?: string) {
  try {
    const sprint = await createSprint({ projectId, name, goal });
    revalidatePath("/projects");
    return { success: true, sprint: { ...sprint, issues: [] } };
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
