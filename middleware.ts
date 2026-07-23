import NextAuth from "next-auth";
import { authConfig } from "./lib/auth.config";

export default NextAuth(authConfig).auth;

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
