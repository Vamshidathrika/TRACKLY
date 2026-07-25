import { NextResponse } from "next/server";
import { processGithubWebhook } from "@/lib/git/processor";
import {
  processGitLabWebhook,
  processBitbucketWebhook,
  processSentryWebhook,
  processVercelWebhook,
} from "@/lib/integrations/providers";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const startTime = Date.now();

  try {
    const rawBody = await req.text();
    let jsonBody: any = {};
    try {
      jsonBody = JSON.parse(rawBody);
    } catch {
      // Form-encoded fallback
      jsonBody = {};
    }

    const providerKey = provider.toLowerCase();
    let result: any = { success: true };

    if (providerKey === "github") {
      result = await processGithubWebhook(req.headers, jsonBody);
    } else if (providerKey === "gitlab") {
      result = await processGitLabWebhook(req.headers, jsonBody);
    } else if (providerKey === "bitbucket") {
      result = await processBitbucketWebhook(req.headers, jsonBody);
    } else if (providerKey === "sentry") {
      result = await processSentryWebhook(req.headers, jsonBody);
    } else if (providerKey === "vercel") {
      result = await processVercelWebhook(req.headers, jsonBody);
    } else {
      return NextResponse.json({ error: `Unsupported provider: ${provider}` }, { status: 400 });
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
