import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(creds) {
        const email = String(creds?.email ?? "").toLowerCase();
        const password = String(creds?.password ?? "");
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;
        return { id: user.id, email: user.email, name: user.name, image: user.avatarUrl };
      },
    }),
    ...(process.env.AUTH_GOOGLE_ID
      ? [Google({ clientId: process.env.AUTH_GOOGLE_ID, clientSecret: process.env.AUTH_GOOGLE_SECRET })]
      : []),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (account?.provider !== "google" || !user.email) return true;
      const existing = await prisma.user.findUnique({ where: { email: user.email.toLowerCase() } });
      if (!existing) {
        const { makeSlug } = await import("./slug");
        await prisma.$transaction(async (tx) => {
          const u = await tx.user.create({
            data: { email: user.email!.toLowerCase(), name: user.name ?? user.email!, avatarUrl: user.image },
          });
          const site = await tx.site.create({
            data: { name: `${u.name}'s site`, slug: makeSlug(u.name) },
          });
          await tx.membership.create({ data: { userId: u.id, siteId: site.id, role: "ADMIN" } });
        });
      }
      return true;
    },
  },
});
