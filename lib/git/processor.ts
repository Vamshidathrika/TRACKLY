import { prisma } from "@/lib/prisma";

/**
 * Jira-grade Multi-Format Task Key Extractor:
 * Matches issue keys in various developer formats:
 * - "TRK-123", "[TRK-123]", "#TRK-123", "trk-123", "TRK_123"
 */
export function extractIssueKeys(text: string): string[] {
  if (!text) return [];
  const regex = /(?:\[|#|\b)([A-Za-z][A-Za-z0-9_]+)[-_](\d+)(?:\]|\b)/g;
  const matches: string[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    matches.push(`${match[1].toUpperCase()}-${match[2]}`);
  }
  if (matches.length === 0) return [];
  return Array.from(new Set(matches));
}

/**
 * Resolves an Issue by key scoped to the specific multi-tenant siteId and optional board projectId.
 */
export async function resolveIssueByKey(siteId: string, key: string, projectId?: string) {
  if (!key) return null;
  const whereClause: any = {
    key: key.toUpperCase().trim(),
    project: { siteId },
  };
  if (projectId) {
    whereClause.projectId = projectId;
  }
  return prisma.issue.findFirst({
    where: whereClause,
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
      const issue = await resolveIssueByKey(siteId, keys[0], gitRepo.projectId);
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
 * Features Smart PR Transitions: Automatically transitions issue status!
 * - PR opened -> IN_REVIEW
 * - PR merged -> DONE
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
    linkedIssue = await resolveIssueByKey(siteId, keys[0], gitRepo.projectId);
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

  // Smart Transitions
  if (linkedIssue) {
    if (status === "MERGED" && linkedIssue.status !== "DONE") {
      await prisma.issue.update({
        where: { id: linkedIssue.id },
        data: { status: "DONE" },
      });
    } else if (status === "OPEN" && linkedIssue.status === "TO_DO") {
      await prisma.issue.update({
        where: { id: linkedIssue.id },
        data: { status: "IN_REVIEW" },
      });
    }
  }
}

/**
 * Processes Git `create` or `delete` branch webhook payload for a site/tenant.
 * Features Smart Branch Transitions: Auto-transitions TO_DO tasks to IN_PROGRESS when branch created!
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
  let linkedIssue: { id: string; status: string; key: string; projectId: string } | null = null;
  if (keys.length > 0) {
    linkedIssue = await resolveIssueByKey(siteId, keys[0], gitRepo.projectId);
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
      issueId: linkedIssue?.id || null,
    },
    update: {
      issueId: linkedIssue?.id || null,
    },
  });

  // Smart Transition: Auto-transition TO_DO tasks to IN_PROGRESS on branch creation
  if (linkedIssue && linkedIssue.status === "TO_DO") {
    await prisma.issue.update({
      where: { id: linkedIssue.id },
      data: { status: "IN_PROGRESS" },
    });
  }
}
