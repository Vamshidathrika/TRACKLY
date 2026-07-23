"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth";
import { requireAdmin } from "@/lib/tenant";
import { createInvite } from "@/lib/invites";
import { updateMemberRole } from "@/lib/admin";
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
    return { success: true };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}
