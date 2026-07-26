import { NextRequest, NextResponse } from "next/server";
import { requireMembership } from "@/lib/tenant";
import { saveOAuthIntegration } from "@/lib/integrations/actions";

/**
 * GET /api/integrations/callback/github
 * Handles GitHub OAuth callback — exchanges code for token, saves to DB.
 */
export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const { searchParams } = new URL(req.url);

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // Redirect to integrations with error if GitHub denied
  if (error || !code) {
    return NextResponse.redirect(`${appUrl}/settings/integrations?error=github_denied`);
  }

  // CSRF: verify state matches cookie
  const savedState = req.cookies.get("gh_oauth_state")?.value;
  if (!savedState || savedState !== state) {
    return NextResponse.redirect(`${appUrl}/settings/integrations?error=github_csrf`);
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${appUrl}/settings/integrations?error=github_not_configured`);
  }

  try {
    // Exchange code for access token
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: `${appUrl}/api/integrations/callback/github`,
      }),
    });

    const tokenData = await tokenRes.json();
    if (tokenData.error || !tokenData.access_token) {
      return NextResponse.redirect(`${appUrl}/settings/integrations?error=github_token`);
    }

    const accessToken: string = tokenData.access_token;

    // Fetch authenticated user profile
    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "Trackly-App",
      },
    });

    const userData = await userRes.json();
    const accountName: string = userData.name || userData.login || "GitHub User";
    const accountAvatar: string = userData.avatar_url || "";

    // Resolve site from session
    const { siteId } = await requireMembership();

    // Save to DB (token encrypted at rest)
    await saveOAuthIntegration(siteId, "GITHUB", accessToken, accountName, accountAvatar);

    // Clear CSRF cookie and redirect to integrations page
    const response = NextResponse.redirect(`${appUrl}/settings/integrations?connected=github`);
    response.cookies.delete("gh_oauth_state");
    return response;
  } catch (e) {
    console.error("GitHub OAuth callback error:", e);
    return NextResponse.redirect(`${appUrl}/settings/integrations?error=github_unknown`);
  }
}
