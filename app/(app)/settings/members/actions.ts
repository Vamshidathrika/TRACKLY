"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createInvite } from "@/lib/invites";

const schema = z.object({ email: z.string().email("Enter a valid email") });

export async function inviteMemberAction(_prev: { error?: string; link?: string }, formData: FormData) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return { error: "Not authenticated" };
  const membership = await prisma.membership.findFirst({ where: { userId, role: "ADMIN" } });
  if (!membership) return { error: "Only admins can invite members" };
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const invite = await createInvite({ siteId: membership.siteId, email: parsed.data.email, role: "MEMBER" });
  console.log(`[invite] ${parsed.data.email} -> http://localhost:3000/invite/${invite.token}`);
  revalidatePath("/settings/members");
  return { link: `/invite/${invite.token}` };
}
