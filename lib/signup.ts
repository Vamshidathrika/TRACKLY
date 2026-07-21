import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { makeSlug } from "./slug";

export async function createAccount(input: { email: string; password: string; name: string; siteName: string }) {
  const existing = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (existing) throw new Error("EMAIL_TAKEN");
  const passwordHash = await bcrypt.hash(input.password, 10);
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email: input.email.toLowerCase(), name: input.name, passwordHash },
    });
    const site = await tx.site.create({ data: { name: input.siteName, slug: makeSlug(input.siteName) } });
    await tx.membership.create({ data: { userId: user.id, siteId: site.id, role: "ADMIN" } });
    return { userId: user.id, siteId: site.id };
  });
}
