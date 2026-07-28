import { NextResponse } from "next/server";
import { processGithubWebhook } from "@/lib/git/processor";
import {
  processGitLabWebhook,
  processBitbucketWebhook,
  processSentryWebhook,
  processVercelWebhook,
} from "@/lib/integrations/providers";
import { authenticateWebhook } from "@/lib/integrations/webhookAuth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const startTime = Date.now();

  try {
    const rawBody = await req.text();

    const providerKey = provider.toLowerCase();
    const supported = ["github", "gitlab", "bitbucket", "sentry", "vercel"];
    if (!supported.includes(providerKey)) {
      return NextResponse.json({ error: `Unsupported provider: ${provider}` }, { status: 400 });
    }

    // Authenticate BEFORE parsing or dispatching. This endpoint used to accept
    // any unsigned POST and process it against a hardcoded "demo-site", which
    // meant a crafted merge event could transition real issues to DONE.
    // The verifying secret also tells us which tenant the delivery belongs to —
    // we never guess a site.
    const auth = await authenticateWebhook(providerKey, req.headers, rawBody);
    if (!auth.ok) {
      const status = auth.reason === "NOT_CONFIGURED" ? 404 : 401;
      return NextResponse.json({ error: "Webhook rejected" }, { status });
    }
    const { siteId } = auth;

    let jsonBody: any = {};
    try {
      jsonBody = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Malformed JSON payload" }, { status: 400 });
    }

    let result: any = { success: true };

    if (providerKey === "github") {
      result = await processGithubWebhook(req.headers, jsonBody, siteId);
    } else if (providerKey === "gitlab") {
      result = await processGitLabWebhook(req.headers, jsonBody, siteId);
    } else if (providerKey === "bitbucket") {
      result = await processBitbucketWebhook(req.headers, jsonBody, siteId);
    } else if (providerKey === "sentry") {
      result = await processSentryWebhook(req.headers, jsonBody, siteId);
    } else {
      result = await processVercelWebhook(req.headers, jsonBody, siteId);
    }

    const latencyMs = Date.now() - startTime;
    return NextResponse.json({
      success: true,
      provider: providerKey.toUpperCase(),
      latencyMs,
      ...result,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Internal webhook processing error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
