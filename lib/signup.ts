import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { makeSlug } from "./slug";

/**
 * Creates an account, optionally consuming an invite.
 *
 * An invite is consumed ONLY when the caller presents its token. This used to
 * match on the email address alone, which meant anyone who knew that an address
 * had been invited could sign up as it and receive the invite's role — including
 * ADMIN — in a workspace they were never invited to. There is no email
 * verification anywhere in the app, so the address proves nothing; possession of
 * the token is the only evidence of consent we actually have.
 */
export async function createAccount(input: {
  email: string;
  password: string;
  name: string;
  siteName: string;
  inviteToken?: string;
}) {
  const normalizedEmail = input.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) throw new Error("EMAIL_TAKEN");
  const passwordHash = await bcrypt.hash(input.password, 10);

  const pendingInvite = input.inviteToken
    ? await prisma.invite.findUnique({ where: { token: input.inviteToken } })
    : null;

  if (input.inviteToken) {
    const usable =
      pendingInvite &&
      !pendingInvite.acceptedAt &&
      pendingInvite.expiresAt > new Date() &&
      pendingInvite.email.toLowerCase() === normalizedEmail;

    // Fail loudly rather than silently falling through to "create your own
    // workspace" — otherwise a mistyped address looks like a successful join.
    if (!usable) throw new Error("INVITE_INVALID");
  }

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

      // The other two acceptance paths (acceptInvite, the Google callback) both
      // grant project access. Without this the user lands as a member with zero
      // ProjectMember rows — empty sidebar, no boards — and since the invite is
      // now consumed, nothing can repair it except a fresh admin invite.
      if (pendingInvite.projectId) {
        await tx.projectMember.create({
          data: { projectId: pendingInvite.projectId, userId: user.id, role: "MEMBER" },
        });
      } else {
        const projects = await tx.project.findMany({
          where: { siteId: pendingInvite.siteId },
          select: { id: true },
        });
        if (projects.length > 0) {
          await tx.projectMember.createMany({
            data: projects.map((p) => ({ projectId: p.id, userId: user.id, role: "MEMBER" as const })),
            skipDuplicates: true,
          });
        }
      }

      return { userId: user.id, siteId: pendingInvite.siteId };
    }

    const site = await tx.site.create({ data: { name: input.siteName, slug: makeSlug(input.siteName) } });
    await tx.membership.create({ data: { userId: user.id, siteId: site.id, role: "ADMIN" } });
    return { userId: user.id, siteId: site.id };
  });
}
