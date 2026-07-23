import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { authConfig } from "./auth.config";

// The secret comes from authConfig, which throws if AUTH_SECRET is unset.
// Never reintroduce a hardcoded fallback here.
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
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
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

import { cache } from "react";
import { getCache, setCache } from "./redis";

export type AuthUser = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
};

export const getAuthUser = cache(async (): Promise<AuthUser> => {
  const session = await auth();

  const userKey = session?.user?.id || session?.user?.email;
  if (userKey) {
    const cacheKey = `user:auth:${userKey.toLowerCase()}`;
    const cachedUser = await getCache<AuthUser>(cacheKey);
    if (cachedUser) return cachedUser;

    const userId = session?.user?.id;
    const userEmail = session?.user?.email;

    const dbUser = await prisma.user.findFirst({
      where: {
        OR: [
          ...(userId ? [{ id: userId }] : []),
          ...(userEmail ? [{ email: userEmail.toLowerCase() }] : []),
        ],
      },
    });

    if (dbUser) {
      const pendingInvite = await prisma.invite.findFirst({
        where: {
          email: dbUser.email.toLowerCase(),
          acceptedAt: null,
          expiresAt: { gt: new Date() },
        },
      });

      if (pendingInvite) {
        await prisma.$transaction([
          prisma.membership.upsert({
            where: { userId_siteId: { userId: dbUser.id, siteId: pendingInvite.siteId } },
            create: { userId: dbUser.id, siteId: pendingInvite.siteId, role: pendingInvite.role },
            update: {},
          }),
          prisma.invite.update({ where: { id: pendingInvite.id }, data: { acceptedAt: new Date() } }),
        ]);

        // Grant per-project access based on invite type
        const { grantProjectAccess, grantAllProjectAccess } = await import("./tenant");
        if (pendingInvite.projectId) {
          await grantProjectAccess(pendingInvite.projectId, dbUser.id);
        } else {
          await grantAllProjectAccess(pendingInvite.siteId, dbUser.id);
        }

        const { delCache } = await import("./redis");
        await delCache(`user:chrome:${dbUser.id}`);
      }

      const authUser: AuthUser = {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        image: dbUser.avatarUrl,
      };
      await setCache(cacheKey, authUser, 600); // 10 minutes cache
      return authUser;
    }
  }

  const { redirect } = await import("next/navigation");
  return redirect("/login") as never;
});
