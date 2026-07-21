import { randomBytes } from "crypto";
import { prisma } from "./prisma";
import type { Role } from "@prisma/client";

export async function createInvite(input: { siteId: string; email: string; role: Role }) {
  return prisma.invite.create({
    data: {
      siteId: input.siteId,
      email: input.email.toLowerCase(),
      role: input.role,
      token: randomBytes(32).toString("base64url"),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
}

export async function acceptInvite(token: string, userId: string) {
  const invite = await prisma.invite.findUnique({ where: { token } });
  if (!invite) return { ok: false as const, reason: "INVALID" as const };
  if (invite.acceptedAt) return { ok: false as const, reason: "USED" as const };
  if (invite.expiresAt < new Date()) return { ok: false as const, reason: "EXPIRED" as const };
  await prisma.$transaction([
    prisma.membership.upsert({
      where: { userId_siteId: { userId, siteId: invite.siteId } },
      create: { userId, siteId: invite.siteId, role: invite.role },
      update: {},
    }),
    prisma.invite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } }),
  ]);
  return { ok: true as const };
}
