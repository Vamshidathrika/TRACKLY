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

export async function getAuthUser() {
  const session = await auth();

  if (session?.user?.id || session?.user?.email) {
    const dbUser = await prisma.user.findFirst({
      where: {
        OR: [
          ...(session.user.id ? [{ id: session.user.id }] : []),
          ...(session.user.email ? [{ email: session.user.email.toLowerCase() }] : []),
        ],
      },
    });

    if (dbUser) {
      return {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        image: dbUser.avatarUrl,
      };
    }
  }

  const { redirect } = await import("next/navigation");
  redirect("/login");
}
