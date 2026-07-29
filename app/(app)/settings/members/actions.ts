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
  _prev: { error?: string; link?: string; emailSent?: boolean; recipient?: string; results?: Array<{ email: string; link: string; emailSent: boolean }> },
  formData: FormData
) {
  const user = await getAuthUser();
  const { siteId, siteName } = await requireAdmin();

  const site = await prisma.site.findUnique({
    where: { id: siteId },
    select: { restrictedDomain: true, allowedDomain: true },
  });

  const emailRaw = (formData.get("email") as string || "").trim();
  if (!emailRaw) return { error: "Please enter at least one valid email address." };

  const roleRaw = (formData.get("role") as string) || "MEMBER";
  const role: Role = roleRaw === "ADMIN" ? "ADMIN" : "MEMBER";

  const projectId = (formData.get("projectId") as string) || undefined;
  let projectName: string | undefined = undefined;

  if (projectId) {
    const proj = await prisma.project.findFirst({ where: { id: projectId, siteId }, select: { name: true } });
    projectName = proj?.name;
  }

  // Parse comma, space, or newline separated emails
  const emails = Array.from(
    new Set(
      emailRaw
        .split(/[\s,;\n]+/)
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e.length > 0)
    )
  );

  const emailSchema = z.string().email();
  const validEmails = emails.filter((e) => emailSchema.safeParse(e).success);

  if (validEmails.length === 0) {
    return { error: "No valid email addresses provided." };
  }

  // Enforce company domain restriction policy
  if (site?.restrictedDomain && site?.allowedDomain) {
    const allowed = site.allowedDomain.toLowerCase().trim();
    const disallowedEmails = validEmails.filter((email) => {
      const domain = email.split("@")[1]?.toLowerCase();
      return domain !== allowed;
    });

    if (disallowedEmails.length > 0) {
      return {
        error: `Security policy restricts invitations to @${allowed} company emails only. Invalid address(es): ${disallowedEmails.join(", ")}`,
      };
    }
  }

  const baseUrl = process.env.AUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const results: Array<{ email: string; link: string; emailSent: boolean }> = [];

  for (const email of validEmails) {
    const invite = await createInvite({ siteId, email, role, projectId });
    const fullInviteUrl = `${baseUrl}/invite/${invite.token}`;

    const emailRes = await sendInviteEmail(
      email,
      fullInviteUrl,
      user.name ?? user.email,
      siteName ?? "Trackly",
      { role, projectName }
    );

    results.push({
      email,
      link: fullInviteUrl,
      emailSent: emailRes.sent,
    });
  }

  revalidatePath("/settings/members");
  revalidatePath("/teams");

  if (results.length === 1) {
    return {
      link: results[0].link,
      emailSent: results[0].emailSent,
      recipient: results[0].email,
      results,
    };
  }

  return {
    results,
    recipient: `${results.length} members`,
    emailSent: results.every((r) => r.emailSent),
  };
}

export async function updateMemberRoleAction(membershipId: string, role: Role) {
  try {
    const { siteId, userId } = await requireAdmin();

    const membership = await prisma.membership.findUnique({ where: { id: membershipId } });
    if (!membership || membership.siteId !== siteId) {
      return { error: "Membership not found" };
    }

    if (membership.role === "ADMIN" && role !== "ADMIN") {
      const otherAdmins = await prisma.membership.count({
        where: { siteId, role: "ADMIN", id: { not: membershipId } },
      });
      if (otherAdmins === 0) {
        return { error: "You cannot remove the last admin of this workspace" };
      }
      if (membership.userId === userId) {
        return { error: "You cannot change your own admin role" };
      }
    }

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
    const { siteId } = await requireAdmin();
    const res = await prisma.invite.deleteMany({ where: { id: inviteId, siteId } });
    if (res.count === 0) return { error: "Invite not found" };
    revalidatePath("/settings/members");
    revalidatePath("/teams");
    return { success: true };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}

export async function resendInviteAction(inviteId: string) {
  try {
    const user = await getAuthUser();
    const { siteName, siteId } = await requireAdmin();
    const invite = await prisma.invite.findFirst({
      where: { id: inviteId, siteId },
      include: { project: { select: { name: true } } },
    });
    if (!invite) return { error: "Invite not found" };
    if (!invite.email) return { error: "This is a share link, not an email invite — nothing to resend." };

    const baseUrl = process.env.AUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    const fullInviteUrl = `${baseUrl}/invite/${invite.token}`;

    const emailRes = await sendInviteEmail(
      invite.email,
      fullInviteUrl,
      user.name ?? user.email,
      siteName ?? "Trackly",
      {
        role: invite.role,
        projectName: invite.project?.name,
      }
    );
    return { success: true, emailSent: emailRes.sent, link: fullInviteUrl };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}

export async function updateDomainSettingsAction(restrictedDomain: boolean, allowedDomain: string) {
  try {
    const { siteId } = await requireAdmin();
    const cleanDomain = allowedDomain.trim().toLowerCase().replace(/^@/, "");

    await prisma.site.update({
      where: { id: siteId },
      data: {
        restrictedDomain,
        allowedDomain: cleanDomain || null,
      },
    });

    revalidatePath("/settings/members");
    revalidatePath("/teams");
    return { success: true };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}



