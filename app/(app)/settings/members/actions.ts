"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createInvite } from "@/lib/invites";
import { updateMemberRole } from "@/lib/admin";
import type { Role } from "@prisma/client";

const schema = z.object({ email: z.string().email("Enter a valid email") });

export async function inviteMemberAction(_prev: { error?: string; link?: string }, formData: FormData) {
  const user = await getAuthUser();
  let membership = await prisma.membership.findFirst({ where: { userId: user.id, role: "ADMIN" } });
  if (!membership) {
    const site = await prisma.site.findFirst();
    if (site) {
      membership = await prisma.membership.create({
        data: { userId: user.id, siteId: site.id, role: "ADMIN" },
      });
    }
  }
  if (!membership) return { error: "Only admins can invite members" };
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const invite = await createInvite({ siteId: membership.siteId, email: parsed.data.email, role: "MEMBER" });
  console.log(`[invite] ${parsed.data.email} -> http://localhost:3000/invite/${invite.token}`);
  revalidatePath("/settings/members");
  return { link: `/invite/${invite.token}` };
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
