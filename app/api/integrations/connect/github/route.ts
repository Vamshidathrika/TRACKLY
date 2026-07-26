import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import crypto from "crypto";

/**
 * GET /api/integrations/connect/github
 * Initiates GitHub OAuth flow — redirects to GitHub authorize page.
 * Requires: GITHUB_CLIENT_ID env var
 *           NEXT_PUBLIC_APP_URL env var
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(`${appUrl}/settings/integrations?error=github_not_configured`);
  }

  // CSRF state token
  const state = crypto.randomBytes(16).toString("hex");

  // Store state in a short-lived cookie for CSRF verification on callback
  const redirectUrl = new URL("https://github.com/login/oauth/authorize");
  redirectUrl.searchParams.set("client_id", clientId);
  redirectUrl.searchParams.set("scope", "repo read:org admin:repo_hook read:user");
  redirectUrl.searchParams.set("state", state);
  redirectUrl.searchParams.set(
    "redirect_uri",
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/integrations/callback/github`
  );

  const response = NextResponse.redirect(redirectUrl.toString());
  response.cookies.set("gh_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 300, // 5 minutes
    path: "/",
  });

  return response;
}
