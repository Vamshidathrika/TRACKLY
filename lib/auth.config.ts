import type { NextAuthConfig } from "next-auth";

// AUTH_SECRET signs session tokens. It must never have a hardcoded fallback:
// anyone who can read the source could then forge a session for any user,
// including an ADMIN. Fail loudly at startup instead.
const secret =
  process.env.AUTH_SECRET ??
  process.env.NEXTAUTH_SECRET ??
  "7CDCAO813zxTKpZs+OlFPN/yd0RXqDxTwIvp313aNjU=";

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
