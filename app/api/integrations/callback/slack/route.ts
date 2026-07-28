import { NextRequest, NextResponse } from "next/server";
import { requireMembership } from "@/lib/tenant";
import { saveOAuthIntegration } from "@/lib/integrations/store";

/**
 * GET /api/integrations/callback/slack
 * Handles Slack OAuth v2 callback — exchanges code for bot token.
 */
export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const { searchParams } = new URL(req.url);

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(`${appUrl}/settings/integrations?error=slack_denied`);
  }

  const savedState = req.cookies.get("slack_oauth_state")?.value;
  if (!savedState || savedState !== state) {
    return NextResponse.redirect(`${appUrl}/settings/integrations?error=slack_csrf`);
  }

  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${appUrl}/settings/integrations?error=slack_not_configured`);
  }

  try {
    const tokenRes = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: `${appUrl}/api/integrations/callback/slack`,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.ok || !tokenData.access_token) {
      return NextResponse.redirect(`${appUrl}/settings/integrations?error=slack_token`);
    }

    const accessToken: string = tokenData.access_token;
    const teamName: string = tokenData.team?.name || "Slack Workspace";
    const webhookUrl: string = tokenData.incoming_webhook?.url || "";
    const channelName: string = tokenData.incoming_webhook?.channel || "";

    const { siteId } = await requireMembership();

    await saveOAuthIntegration(
      siteId,
      "SLACK",
      accessToken,
      teamName,
      undefined,
      undefined,
      JSON.stringify({ webhookUrl, channelName, teamId: tokenData.team?.id })
    );

    const response = NextResponse.redirect(`${appUrl}/settings/integrations?connected=slack`);
    response.cookies.delete("slack_oauth_state");
    return response;
  } catch (e) {
    console.error("Slack OAuth callback error:", e);
    return NextResponse.redirect(`${appUrl}/settings/integrations?error=slack_unknown`);
  }
}
