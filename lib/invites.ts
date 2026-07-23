import { randomBytes } from "crypto";
import { prisma } from "./prisma";
import type { Role } from "@prisma/client";
import { grantProjectAccess, grantAllProjectAccess } from "./tenant";

export async function createInvite(input: {
  siteId: string;
  email: string;
  role: Role;
  projectId?: string;
}) {
  return prisma.invite.create({
    data: {
      siteId: input.siteId,
      email: input.email.toLowerCase(),
      role: input.role,
      projectId: input.projectId ?? null,
      token: randomBytes(32).toString("base64url"),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
}

export async function acceptInvite(token: string, userId: string) {
  const invite = await prisma.invite.findUnique({
    where: { token },
    include: { project: { select: { key: true } } },
  });
  if (!invite) return { ok: false as const, reason: "INVALID" as const };
  if (invite.acceptedAt) return { ok: false as const, reason: "USED" as const };
  if (invite.expiresAt < new Date()) return { ok: false as const, reason: "EXPIRED" as const };

  // 1. Create workspace membership
  await prisma.$transaction([
    prisma.membership.upsert({
      where: { userId_siteId: { userId, siteId: invite.siteId } },
      create: { userId, siteId: invite.siteId, role: invite.role },
      update: { role: invite.role },
    }),
    prisma.invite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } }),
  ]);

  // 2. Grant project-level access
  if (invite.projectId) {
    // Project-specific invite → grant access to just that project
    await grantProjectAccess(invite.projectId, userId);
  } else {
    // Workspace-wide invite → grant access to all existing projects
    await grantAllProjectAccess(invite.siteId, userId);
  }

  // 3. Invalidate caches
  const { delCache } = await import("./redis");
  await delCache(`user:chrome:${userId}`);

  // Determine redirect target
  const projectKey = invite.project?.key ?? (
    await prisma.project.findFirst({
      where: { siteId: invite.siteId },
      orderBy: { createdAt: "desc" },
      select: { key: true },
    })
  )?.key;

  return { ok: true as const, projectKey, siteId: invite.siteId };
}
