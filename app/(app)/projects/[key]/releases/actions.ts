"use server";

import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth";
import { checkProjectAccess, checkProjectAdmin } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import {
  createRelease,
  updateRelease,
  deleteRelease,
  setReleaseStatus,
  updateReleaseNotes,
  getReleasesByProject,
} from "@/lib/releases";
import type { ReleaseStatus } from "@prisma/client";

async function requireProjectAdminWrite(projectId: string) {
  const user = await getAuthUser();
  const isAdmin = await checkProjectAdmin(user.id, projectId);
  if (!isAdmin) throw new Error("Only board owners and workspace admins can manage release versions");
  return { user };
}

async function requireReleaseWrite(releaseId: string) {
  const release = await prisma.release.findUnique({ where: { id: releaseId }, select: { projectId: true } });
  if (!release) throw new Error("Release not found");
  return requireProjectAdminWrite(release.projectId);
}

export async function getReleasesAction(projectId: string) {
  const user = await getAuthUser();
  const access = await checkProjectAccess(user.id, projectId);
  if (!access) return { error: "You do not have access to this board" };
  return { success: true, releases: await getReleasesByProject(projectId) };
}

export async function createReleaseAction(
  projectId: string,
  name: string,
  description?: string,
  releaseDate?: string
) {
  try {
    if (!name.trim()) return { error: "Version name is required" };
    await requireProjectAdminWrite(projectId);
    await createRelease({
      projectId,
      name: name.trim(),
      description: description?.trim() || undefined,
      releaseDate: releaseDate ? new Date(releaseDate) : undefined,
    });
    revalidatePath("/projects");
    return { success: true };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}

export async function updateReleaseAction(
  releaseId: string,
  data: { name?: string; description?: string; releaseDate?: string | null }
) {
  try {
    await requireReleaseWrite(releaseId);
    await updateRelease(releaseId, {
      name: data.name?.trim(),
      description: data.description?.trim(),
      releaseDate: data.releaseDate === undefined ? undefined : data.releaseDate ? new Date(data.releaseDate) : null,
    });
    revalidatePath("/projects");
    return { success: true };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}

export async function deleteReleaseAction(releaseId: string) {
  try {
    await requireReleaseWrite(releaseId);
    await deleteRelease(releaseId);
    revalidatePath("/projects");
    return { success: true };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}

export async function setReleaseStatusAction(releaseId: string, status: ReleaseStatus) {
  try {
    await requireReleaseWrite(releaseId);
    await setReleaseStatus(releaseId, status);
    revalidatePath("/projects");
    return { success: true };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}

export async function updateReleaseNotesAction(releaseId: string, notesMarkdown: string) {
  try {
    await requireReleaseWrite(releaseId);
    await updateReleaseNotes(releaseId, notesMarkdown);
    revalidatePath("/projects");
    return { success: true };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}
