import NextAuth from "next-auth";
import { authConfig } from "./lib/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    "/your-work/:path*",
    "/projects/:path*",
    "/filters/:path*",
    "/dashboards/:path*",
    "/settings/:path*",
  ],
};
