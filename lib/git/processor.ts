import { prisma } from "@/lib/prisma";

/**
 * Jira-grade Issue Key Regex Extractor:
 * Matches issue keys like "TRK-123", "VAM-14", "PROJ_99-42"
 */
export function extractIssueKeys(text: string): string[] {
  if (!text) return [];
  const regex = /\b([A-Z][A-Z0-9_]+)-(\d+)\b/g;
  const matches = text.match(regex);
  if (!matches) return [];
  return Array.from(new Set(matches.map((m) => m.toUpperCase())));
}

/**
 * Resolves an Issue by key scoped to the specific multi-tenant siteId.
 */
export async function resolveIssueByKey(siteId: string, key: string) {
  if (!key) return null;
  return prisma.issue.findFirst({
    where: {
      key: key.toUpperCase().trim(),
      project: { siteId },
    },
    select: { id: true, status: true, key: true, projectId: true },
  });
}

/**
 * Processes Git `push` webhook payload for a site/tenant.
 */
export async function processPushEvent(payload: any, siteId: string) {
  const repoName = payload.repository?.name;
  const owner = payload.repository?.owner?.login || payload.repository?.owner?.name;
  if (!repoName || !owner) return;

  const gitRepo = await prisma.gitRepository.findFirst({
    where: { siteId, owner, repoName },
  });
  if (!gitRepo) return;

  const commits = payload.commits || [];
  for (const c of commits) {
    const keys = extractIssueKeys(c.message);
    let linkedIssueId: string | null = null;
    if (keys.length > 0) {
      const issue = await resolveIssueByKey(siteId, keys[0]);
      if (issue) linkedIssueId = issue.id;
    }

    const hash = c.id.substring(0, 7);
    await prisma.gitCommit.upsert({
      where: {
        repositoryId_hash: {
          repositoryId: gitRepo.id,
          hash,
        },
      },
      create: {
        siteId,
        repositoryId: gitRepo.id,
        hash,
        message: c.message,
        authorName: c.author?.name || "Developer",
        authorAvatar: c.author?.avatar_url || null,
        committedAt: new Date(c.timestamp || Date.now()),
        url: c.url || `https://github.com/${owner}/${repoName}/commit/${c.id}`,
        issueId: linkedIssueId,
      },
      update: {
        message: c.message,
        issueId: linkedIssueId,
      },
    });
  }
}

/**
 * Processes Git `pull_request` webhook payload for a site/tenant.
 * Features Smart PR Transitions: Automatically transitions issue status to DONE when PR is merged!
 */
export async function processPullRequestEvent(payload: any, siteId: string) {
  const repoName = payload.repository?.name;
  const owner = payload.repository?.owner?.login;
  const pr = payload.pull_request;
  if (!repoName || !owner || !pr) return;

  const gitRepo = await prisma.gitRepository.findFirst({
    where: { siteId, owner, repoName },
  });
  if (!gitRepo) return;

  const keys = extractIssueKeys(`${pr.title} ${pr.body || ""} ${pr.head?.ref || ""}`);
  let linkedIssue: { id: string; status: string; key: string; projectId: string } | null = null;
  if (keys.length > 0) {
    linkedIssue = await resolveIssueByKey(siteId, keys[0]);
  }

  let status = "OPEN";
  if (pr.merged || payload.action === "closed" && pr.merged) {
    status = "MERGED";
  } else if (pr.state === "closed" || payload.action === "closed") {
    status = "CLOSED";
  }

  await prisma.pullRequest.upsert({
    where: {
      repositoryId_prNumber: {
        repositoryId: gitRepo.id,
        prNumber: pr.number,
      },
    },
    create: {
      siteId,
      repositoryId: gitRepo.id,
      prNumber: pr.number,
      title: pr.title,
      status,
      authorName: pr.user?.login || "Developer",
      authorAvatar: pr.user?.avatar_url || null,
      url: pr.html_url,
      issueId: linkedIssue?.id || null,
    },
    update: {
      title: pr.title,
      status,
      issueId: linkedIssue?.id || null,
    },
  });

  // Smart Transition: Auto-transition linked issue to DONE when PR is MERGED
  if (status === "MERGED" && linkedIssue && linkedIssue.status !== "DONE") {
    await prisma.issue.update({
      where: { id: linkedIssue.id },
      data: { status: "DONE" },
    });
  }
}

/**
 * Processes Git `create` or `delete` branch webhook payload for a site/tenant.
 */
export async function processBranchEvent(payload: any, siteId: string, action: "create" | "delete") {
  const repoName = payload.repository?.name;
  const owner = payload.repository?.owner?.login;
  const refType = payload.ref_type;
  const branchName = payload.ref;
  if (!repoName || !owner || refType !== "branch" || !branchName) return;

  const gitRepo = await prisma.gitRepository.findFirst({
    where: { siteId, owner, repoName },
  });
  if (!gitRepo) return;

  if (action === "delete") {
    await prisma.gitBranch.deleteMany({
      where: { repositoryId: gitRepo.id, name: branchName },
    });
    return;
  }

  const keys = extractIssueKeys(branchName);
  let linkedIssueId: string | null = null;
  if (keys.length > 0) {
    const issue = await resolveIssueByKey(siteId, keys[0]);
    if (issue) linkedIssueId = issue.id;
  }

  await prisma.gitBranch.upsert({
    where: {
      repositoryId_name: {
        repositoryId: gitRepo.id,
        name: branchName,
      },
    },
    create: {
      siteId,
      repositoryId: gitRepo.id,
      name: branchName,
      lastCommitHash: payload.master_branch ? payload.master_branch.substring(0, 7) : null,
      issueId: linkedIssueId,
    },
    update: {
      issueId: linkedIssueId,
    },
  });
}
