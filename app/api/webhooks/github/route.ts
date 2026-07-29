import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyGithubWebhookSignature } from "@/lib/github";
import {
  processPushEvent,
  processPullRequestEvent,
  processBranchEvent,
} from "@/lib/git/processor";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const event = req.headers.get("x-github-event");
    const signature = req.headers.get("x-hub-signature-256") || "";

    // 1. HMAC Signature Verification — hard-fail if secret is not configured.
    // An unset secret means anyone on the internet can forge payloads, so we
    // refuse to process rather than silently accepting unsigned requests.
    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    if (!secret) {
      return NextResponse.json(
        { error: "Webhook not configured — GITHUB_WEBHOOK_SECRET is not set" },
        { status: 503 }
      );
    }
    if (!verifyGithubWebhookSignature(signature, rawBody, secret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    // 2. Resolve Multi-Tenant Site (tenantId)
    let siteId: string | null = null;

    if (payload.installation?.id) {
      const gitInst = await prisma.gitInstallation.findUnique({
        where: { installationId: String(payload.installation.id) },
        select: { siteId: true },
      });
      if (gitInst) siteId = gitInst.siteId;
    }

    if (!siteId && payload.repository) {
      const owner = payload.repository.owner?.login || payload.repository.owner?.name;
      const repoName = payload.repository.name;
      if (owner && repoName) {
        const repo = await prisma.gitRepository.findFirst({
          where: { owner, repoName },
          select: { siteId: true },
        });
        if (repo) siteId = repo.siteId;
      }
    }

    if (!siteId) {
      return NextResponse.json({ message: "No matching tenant site found" }, { status: 404 });
    }

    // 3. Dispatch Webhook Event Handlers
    if (event === "push") {
      await processPushEvent(payload, siteId);
    } else if (event === "pull_request") {
      await processPullRequestEvent(payload, siteId);
    } else if (event === "create") {
      await processBranchEvent(payload, siteId, "create");
    } else if (event === "delete") {
      await processBranchEvent(payload, siteId, "delete");
    }

    // 4. Log Webhook Execution
    await prisma.gitWebhookLog.create({
      data: {
        siteId,
        event: event || "unknown",
        action: payload.action || null,
        repositoryName: payload.repository?.full_name || payload.repository?.name || null,
        senderName: payload.sender?.login || null,
        status: "PROCESSED",
      },
    }).catch(() => {});

    return NextResponse.json({ success: true, event });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}
