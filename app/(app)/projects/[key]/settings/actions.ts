"use server";

import { revalidatePath } from "next/cache";
import { requireMembership, requireAdmin } from "@/lib/tenant";
import { createCustomField, deleteCustomField } from "@/lib/admin";
import {
  updateProject,
  deleteProject,
  addProjectMember,
  updateProjectMemberRole,
  removeProjectMember,
} from "@/lib/projects";
import type { ProjectType, ProjectRole } from "@prisma/client";

export async function updateProjectDetailsAction(
  projectId: string,
  name: string,
  key: string,
  type?: ProjectType,
  leadId?: string
) {
  try {
    const { siteId } = await requireMembership();
    await updateProject(siteId, projectId, { name, key, type, leadId });
    revalidatePath("/projects");
    return { success: true };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}

export async function deleteProjectAction(projectId: string) {
  try {
    const { siteId, userId } = await requireMembership();
    const res = await deleteProject(siteId, projectId, userId);
    revalidatePath("/", "layout");
    revalidatePath("/projects");
    revalidatePath("/your-work");
    return res;
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}

export async function addProjectMemberAction(
  projectId: string,
  userId: string,
  role: ProjectRole = "MEMBER"
) {
  try {
    await requireMembership();
    const member = await addProjectMember({ projectId, userId, role });
    revalidatePath("/projects");
    return { success: true, member };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}

export async function updateProjectMemberRoleAction(
  projectId: string,
  userId: string,
  role: ProjectRole
) {
  try {
    await requireMembership();
    await updateProjectMemberRole(projectId, userId, role);
    revalidatePath("/projects");
    return { success: true };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}

export async function removeProjectMemberAction(projectId: string, userId: string) {
  try {
    await requireMembership();
    await removeProjectMember(projectId, userId);
    // Unassign issues assigned to removed member
    const { prisma } = await import("@/lib/prisma");
    await prisma.issue.updateMany({
      where: { projectId, assigneeId: userId },
      data: { assigneeId: null },
    });
    revalidatePath("/projects");
    return { success: true };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}

export async function leaveProjectAction(projectId: string) {
  try {
    const { userId } = await requireMembership();
    await removeProjectMember(projectId, userId);
    const { prisma } = await import("@/lib/prisma");
    await prisma.issue.updateMany({
      where: { projectId, assigneeId: userId },
      data: { assigneeId: null },
    });
    revalidatePath("/", "layout");
    revalidatePath("/projects");
    revalidatePath("/your-work");
    return { success: true };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}

export async function createCustomFieldAction(projectId: string, name: string, fieldType: string, required: boolean) {
  try {
    await requireMembership();
    const field = await createCustomField({ projectId, name, fieldType, required });
    revalidatePath("/projects");
    return { success: true, field };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}

export async function deleteCustomFieldAction(fieldId: string) {
  try {
    await requireMembership();
    await deleteCustomField(fieldId);
    revalidatePath("/projects");
    return { success: true };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}


/**
 * Issue a real, tokenised invite for a single board.
 *
 * The Share dialog previously faked this: it rendered "Invitation sent" from
 * client state without calling anything, while its "copy link" produced an
 * untokenised /join URL that granted access to whoever opened it. Sharing now
 * goes through the same expiring, single-use Invite record as every other
 * invitation, and only a board admin can issue one.
 */
export async function shareBoardByEmailAction(projectKey: string, email: string) {
  try {
    const { getAuthUser } = await import("@/lib/auth");
    const { checkProjectAccess } = await import("@/lib/tenant");
    const { getProjectByKey } = await import("@/lib/projects");
    const { createInvite } = await import("@/lib/invites");
    const { sendInviteEmail } = await import("@/lib/email");

    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return { error: "Enter a valid email address" };
    }

    const user = await getAuthUser();
    const { siteId, siteName } = await requireMembership();

    const project = await getProjectByKey(siteId, projectKey);
    if (!project) return { error: "Board not found" };

    const access = await checkProjectAccess(user.id, project.id);
    if (!access || (access.projectRole !== "ADMIN" && access.projectRole !== "WORKSPACE_ADMIN")) {
      return { error: "Only board owners and workspace admins can share this board" };
    }

    const invite = await createInvite({
      siteId,
      email: trimmed,
      role: "MEMBER",
      projectId: project.id,
    });

    const baseUrl =
      process.env.AUTH_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    const inviteUrl = `${baseUrl}/invite/${invite.token}`;

    const emailRes = await sendInviteEmail(trimmed, inviteUrl, user.name ?? user.email, siteName);

    return { success: true, inviteUrl, emailSent: emailRes.sent, recipient: trimmed };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}
