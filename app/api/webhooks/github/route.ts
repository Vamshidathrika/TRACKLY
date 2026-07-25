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

    // 1. HMAC Signature Verification
    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    if (secret && !verifyGithubWebhookSignature(signature, rawBody, secret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);

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

    // Fallback: If single tenant site exists
    if (!siteId) {
      const firstSite = await prisma.site.findFirst({ select: { id: true } });
      if (firstSite) siteId = firstSite.id;
    }

    if (!siteId) {
      return NextResponse.json({ message: "No matching tenant site found" }, { status: 200 });
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

    return NextResponse.json({ success: true, event });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}
