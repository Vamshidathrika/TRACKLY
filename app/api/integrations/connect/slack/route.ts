import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import crypto from "crypto";

/**
 * GET /api/integrations/connect/slack
 * Initiates Slack OAuth v2 flow.
 * Requires: SLACK_CLIENT_ID env var
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientId = process.env.SLACK_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "Slack OAuth not configured. Set SLACK_CLIENT_ID in environment variables." },
      { status: 503 }
    );
  }

  const state = crypto.randomBytes(16).toString("hex");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const redirectUrl = new URL("https://slack.com/oauth/v2/authorize");
  redirectUrl.searchParams.set("client_id", clientId);
  redirectUrl.searchParams.set(
    "scope",
    "incoming-webhook,channels:read,chat:write,channels:history,groups:read"
  );
  redirectUrl.searchParams.set("state", state);
  redirectUrl.searchParams.set("redirect_uri", `${appUrl}/api/integrations/callback/slack`);

  const response = NextResponse.redirect(redirectUrl.toString());
  response.cookies.set("slack_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 300,
    path: "/",
  });

  return response;
}
