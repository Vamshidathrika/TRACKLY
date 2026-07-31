import type { NextAuthConfig } from "next-auth";
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- required so TS resolves the module for augmentation below
import type { JWT } from "next-auth/jwt";
import type { Role } from "@prisma/client";

// Workspace identity carried on the session token so the common navigation
// path (lib/tenant.ts requireMembership) can trust it instead of hitting
// Redis or the database, guarded by membershipVersion (see access-cache.ts).
declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    siteId?: string;
    role?: Role;
    membershipVersion?: number;
  }
}

declare module "next-auth" {
  interface Session {
    siteId?: string;
    role?: Role;
    membershipVersion?: number;
  }
}

// AUTH_SECRET signs session tokens. It must never have a hardcoded fallback:
// anyone who can read the source could then forge a session for any user,
// including an ADMIN. Fail loudly at startup instead.
const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

if (!secret) {
  throw new Error(
    "AUTH_SECRET is not set. Generate one with `openssl rand -base64 32` and add it to .env. " +
      "Refusing to start with an unsigned or predictable session key."
  );
}

export const authConfig: NextAuthConfig = {
  trustHost: true,
  secret,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.userId = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = (token.userId || token.sub) as string;
      }
      return session;
    },
    authorized({ auth, request }) {
      return !!auth?.user || request.nextUrl.pathname === "/";
    },
  },
};
