"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth";
import { requireAdmin } from "@/lib/tenant";
import { createInvite } from "@/lib/invites";
import { updateMemberRole, removeWorkspaceMember } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";
import { sendInviteEmail } from "@/lib/email";

const schema = z.object({ email: z.string().email("Enter a valid email") });

export async function inviteMemberAction(
  _prev: { error?: string; link?: string; emailSent?: boolean; recipient?: string },
  formData: FormData
) {
  const user = await getAuthUser();
  const { siteId, siteName } = await requireAdmin();

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const projectId = formData.get("projectId") as string | null;
  const invite = await createInvite({ siteId, email: parsed.data.email, role: "MEMBER", projectId: projectId || undefined });

  const baseUrl = process.env.AUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  const fullInviteUrl = `${baseUrl}/invite/${invite.token}`;

  const emailRes = await sendInviteEmail(parsed.data.email, fullInviteUrl, user.name ?? user.email, siteName ?? "Trackly");

  revalidatePath("/settings/members");
  return {
    link: fullInviteUrl,
    emailSent: emailRes.sent,
    recipient: parsed.data.email,
  };
}

export async function updateMemberRoleAction(membershipId: string, role: Role) {
  try {
    await updateMemberRole(membershipId, role);
    revalidatePath("/settings/members");
    revalidatePath("/teams");
    return { success: true };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}

export async function updateMemberRoleByUserIdAction(targetUserId: string, role: Role) {
  try {
    const { siteId } = await requireAdmin();
    const membership = await prisma.membership.findFirst({
      where: { userId: targetUserId, siteId },
    });
    if (!membership) return { error: "Membership not found" };

    await updateMemberRole(membership.id, role);
    revalidatePath("/settings/members");
    revalidatePath("/teams");
    return { success: true };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}

export async function removeMemberAction(targetUserId: string) {
  try {
    const user = await getAuthUser();
    if (user.id === targetUserId) {
      return { error: "You cannot remove yourself from the workspace" };
    }
    const { siteId } = await requireAdmin();
    await removeWorkspaceMember(siteId, targetUserId);
    revalidatePath("/settings/members");
    revalidatePath("/teams");
    return { success: true };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}

export async function revokeInviteAction(inviteId: string) {
  try {
    await requireAdmin();
    await prisma.invite.delete({ where: { id: inviteId } });
    revalidatePath("/settings/members");
    revalidatePath("/teams");
    return { success: true };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}
