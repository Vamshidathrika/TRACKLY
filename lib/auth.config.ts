import type { NextAuthConfig } from "next-auth";

// AUTH_SECRET signs session tokens. It must never have a hardcoded fallback:
// anyone who can read the source could then forge a session for any user,
// including an ADMIN. Fail loudly at startup instead.
const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

if (!secret) {
  throw new Error(
    "AUTH_SECRET is not set. Generate one with `openssl rand -base64 32` and " +
      "set it in .env locally, or in your hosting provider's environment " +
      "variables in production."
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
      if (session.user) (session.user as { id?: string }).id = token.userId as string;
      return session;
    },
    authorized({ auth, request }) {
      return !!auth?.user || request.nextUrl.pathname === "/";
    },
  },
};
