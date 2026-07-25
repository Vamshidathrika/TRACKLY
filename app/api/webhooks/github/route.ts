import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractTaskKeys, verifyGithubWebhookSignature } from "@/lib/github";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const event = req.headers.get("x-github-event");
    const signature = req.headers.get("x-hub-signature-256") || "";

    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    if (secret && !verifyGithubWebhookSignature(signature, rawBody, secret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);

    if (event === "push" && payload.repository) {
      const owner = payload.repository.owner?.login || payload.repository.owner?.name;
      const repoName = payload.repository.name;
      const ref = payload.ref || "";
      const branchName = ref.replace("refs/heads/", "");

      const gitRepo = await prisma.gitRepository.findFirst({
        where: { owner, repoName },
      });

      if (gitRepo) {
        // Upsert Branch
        const branchTaskKeys = extractTaskKeys(branchName);
        let linkedIssueId: string | null = null;
        if (branchTaskKeys.length > 0) {
          const matchedIssue = await prisma.issue.findFirst({
            where: { key: branchTaskKeys[0], projectId: gitRepo.projectId },
            select: { id: true },
          });
          if (matchedIssue) linkedIssueId = matchedIssue.id;
        }

        await prisma.gitBranch.upsert({
          where: { id: `${gitRepo.id}-${branchName}` },
          create: {
            id: `${gitRepo.id}-${branchName}`,
            repositoryId: gitRepo.id,
            name: branchName,
            lastCommitHash: payload.after?.substring(0, 7) || null,
            issueId: linkedIssueId,
          },
          update: {
            lastCommitHash: payload.after?.substring(0, 7) || null,
            issueId: linkedIssueId,
          },
        });

        // Store Commits
        const commits = payload.commits || [];
        for (const c of commits) {
          const keys = extractTaskKeys(c.message);
          let issueId: string | null = null;
          if (keys.length > 0) {
            const matched = await prisma.issue.findFirst({
              where: { key: keys[0], projectId: gitRepo.projectId },
              select: { id: true },
            });
            if (matched) issueId = matched.id;
          }

          await prisma.gitCommit.create({
            data: {
              repositoryId: gitRepo.id,
              hash: c.id.substring(0, 7),
              message: c.message,
              authorName: c.author?.name || "Developer",
              committedAt: new Date(c.timestamp || Date.now()),
              url: c.url || `https://github.com/${owner}/${repoName}/commit/${c.id}`,
              issueId,
            },
          });
        }
      }
    }

    if (event === "pull_request" && payload.repository && payload.pull_request) {
      const owner = payload.repository.owner?.login;
      const repoName = payload.repository.name;
      const pr = payload.pull_request;

      const gitRepo = await prisma.gitRepository.findFirst({
        where: { owner, repoName },
      });

      if (gitRepo) {
        const keys = extractTaskKeys(`${pr.title} ${pr.head?.ref || ""}`);
        let issueId: string | null = null;
        if (keys.length > 0) {
          const matched = await prisma.issue.findFirst({
            where: { key: keys[0], projectId: gitRepo.projectId },
            select: { id: true },
          });
          if (matched) issueId = matched.id;
        }

        let status = "OPEN";
        if (pr.merged) status = "MERGED";
        else if (pr.state === "closed") status = "CLOSED";

        await prisma.pullRequest.upsert({
          where: { id: `${gitRepo.id}-pr-${pr.number}` },
          create: {
            id: `${gitRepo.id}-pr-${pr.number}`,
            repositoryId: gitRepo.id,
            prNumber: pr.number,
            title: pr.title,
            status,
            authorName: pr.user?.login || "Developer",
            authorAvatar: pr.user?.avatar_url || null,
            url: pr.html_url,
            issueId,
          },
          update: {
            title: pr.title,
            status,
            issueId,
          },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}
