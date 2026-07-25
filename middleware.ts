import NextAuth from "next-auth";
import { authConfig } from "./lib/auth.config";
import { NextResponse } from "next/server";

const authMiddleware = NextAuth(authConfig).auth;

export default authMiddleware((req) => {
  const { pathname } = req.nextUrl;
  const requestHeaders = new Headers(req.headers);

  const match = pathname.match(/^\/([^\/]+)/);
  if (match) {
    const slug = match[1];
    if (!["api", "_next", "favicon.ico", "auth"].includes(slug)) {
      requestHeaders.set("x-tenant-slug", slug);
    }
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
});

export const config = {
  matcher: [
    "/your-work",
    "/your-work/:path*",
    "/projects",
    "/projects/:path*",
    "/filters",
    "/filters/:path*",
    "/dashboards",
    "/dashboards/:path*",
    "/settings",
    "/settings/:path*",
    "/plans",
    "/plans/:path*",
    "/teams",
    "/teams/:path*",
  ],
};

