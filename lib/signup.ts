import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { makeSlug } from "./slug";

export async function createAccount(input: { email: string; password: string; name: string; siteName: string }) {
  const normalizedEmail = input.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) throw new Error("EMAIL_TAKEN");
  const passwordHash = await bcrypt.hash(input.password, 10);

  const pendingInvite = await prisma.invite.findFirst({
    where: {
      email: normalizedEmail,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email: normalizedEmail, name: input.name, passwordHash },
    });

    if (pendingInvite) {
      await tx.membership.create({
        data: { userId: user.id, siteId: pendingInvite.siteId, role: pendingInvite.role },
      });
      await tx.invite.update({
        where: { id: pendingInvite.id },
        data: { acceptedAt: new Date() },
      });
      return { userId: user.id, siteId: pendingInvite.siteId };
    }

    const site = await tx.site.create({ data: { name: input.siteName, slug: makeSlug(input.siteName) } });
    await tx.membership.create({ data: { userId: user.id, siteId: site.id, role: "ADMIN" } });
    return { userId: user.id, siteId: site.id };
  });
}
