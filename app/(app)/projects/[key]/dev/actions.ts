"use server";

import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkProjectAccess, checkProjectAdmin } from "@/lib/tenant";
import { fetchGithubRepoStats, validateAndSyncGithubRepo } from "@/lib/github";

/**
 * Resolves a repository and confirms the caller may administer the project that
 * owns it. Every action here takes a bare `repositoryId` from the client, and a
 * GitRepository row carries a stored access token — without this check, passing
 * a foreign id lets an attacker repoint another tenant's repo while that
 * tenant's credential is used to fetch it.
 */
async function requireRepoAdmin(userId: string, repositoryId: string) {
  const repo = await prisma.gitRepository.findUnique({ where: { id: repositoryId } });
  if (!repo) return { error: "Repository not found" as const };
  if (!(await checkProjectAdmin(userId, repo.projectId))) {
    return { error: "Only board owners and workspace admins can manage repositories" as const };
  }
  return { repo };
}

export async function connectGithubRepoAction(input: {
  projectId: string;
  owner: string;
  repoName: string;
  accessToken?: string;
}) {
  const user = await getAuthUser();
  if (!input.owner.trim() || !input.repoName.trim()) {
    return { error: "Owner and repository name are required" };
  }

  try {
    const owner = input.owner.trim();
    const repoName = input.repoName.trim();

    const project = await prisma.project.findUnique({
      where: { id: input.projectId },
      select: { siteId: true },
    });
    if (!project) return { error: "Project not found" };

    // The project was previously read only to lift its siteId — the client's
    // projectId was never checked against the caller.
    if (!(await checkProjectAdmin(user.id, input.projectId))) {
      return { error: "Only board owners and workspace admins can connect repositories" };
    }

    const syncRes = await validateAndSyncGithubRepo({
      owner,
      repoName,
      accessToken: input.accessToken?.trim() || undefined,
      siteId: project.siteId,
      projectId: input.projectId,
    });

    if (!syncRes.success) {
      // Purge any stale/false connection record
      await prisma.gitRepository.deleteMany({
        where: {
          projectId: input.projectId,
          owner,
          repoName,
        },
      }).catch(() => null);

      return { error: syncRes.error };
    }

    revalidatePath("/projects");
    return { success: true, repo: syncRes.repoData };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    return { error: "Could not connect repository" };
  }
}

export async function syncGithubRepoAction(repositoryId: string) {
  const user = await getAuthUser();
  try {
    const guard = await requireRepoAdmin(user.id, repositoryId);
    if ("error" in guard) return { error: guard.error };
    const { repo } = guard;

    const syncRes = await validateAndSyncGithubRepo({
      repositoryId: repo.id,
      owner: repo.owner,
      repoName: repo.repoName,
      accessToken: repo.accessToken || undefined,
      siteId: repo.siteId,
      projectId: repo.projectId,
    });

    if (!syncRes.success) {
      return { error: syncRes.error };
    }

    revalidatePath("/projects");
    return { success: true };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    return { error: "Failed to sync repository" };
  }
}

export async function updateGithubRepoAction(input: {
  repositoryId: string;
  owner?: string;
  repoName?: string;
  accessToken?: string;
}) {
  const user = await getAuthUser();
  try {
    const guard = await requireRepoAdmin(user.id, input.repositoryId);
    if ("error" in guard) return { error: guard.error };
    const existing = guard.repo;

    const targetOwner = input.owner?.trim() || existing.owner;
    const targetRepoName = input.repoName?.trim() || existing.repoName;
    const targetAccessToken = input.accessToken !== undefined ? input.accessToken.trim() || undefined : existing.accessToken || undefined;

    const syncRes = await validateAndSyncGithubRepo({
      repositoryId: existing.id,
      owner: targetOwner,
      repoName: targetRepoName,
      accessToken: targetAccessToken,
      siteId: existing.siteId,
      projectId: existing.projectId,
    });

    if (!syncRes.success) {
      return { error: syncRes.error };
    }

    revalidatePath("/projects");
    return { success: true, repo: syncRes.repoData };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    return { error: "Failed to update repository settings" };
  }
}

export async function disconnectGithubRepoAction(repositoryId: string) {
  const user = await getAuthUser();
  try {
    const guard = await requireRepoAdmin(user.id, repositoryId);
    if ("error" in guard) return { error: guard.error };

    await prisma.gitRepository.delete({
      where: { id: repositoryId },
    });
    revalidatePath("/projects");
    return { success: true };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    return { error: "Failed to disconnect repository" };
  }
}

const EMPTY_DEV_DASHBOARD = {
  hasConnectedRepo: false,
  repos: [] as { id: string; owner: string; repoName: string; createdAt: Date }[],
  webhookLogs: [] as any[],
  stats: {
    activeBranches: 0,
    openPRs: 0,
    mergedPRs: 0,
    pipelineStatus: "Idle",
    commits: [] as any[],
  },
};

export async function fetchDevDashboardDataAction(projectId: string) {
  const user = await getAuthUser();
  try {
    // Returns commit messages, PR titles, author names and the site's webhook
    // log — read access to the board is the minimum bar for seeing any of it.
    if (!(await checkProjectAccess(user.id, projectId))) {
      return EMPTY_DEV_DASHBOARD;
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { siteId: true, key: true },
    });

    const repos = await prisma.gitRepository.findMany({
      where: { projectId },
      include: {
        commits: { orderBy: { committedAt: "desc" }, take: 10 },
        pullRequests: { orderBy: { createdAt: "desc" } },
        branches: true,
      },
    });

    let webhookLogs: any[] = [];
    if (project?.siteId) {
      const dbLogs = await prisma.gitWebhookLog.findMany({
        where: { siteId: project.siteId },
        orderBy: { createdAt: "desc" },
        take: 10,
      });

      webhookLogs = dbLogs.map((log) => ({
        id: log.id,
        provider: "GITHUB",
        eventType: `github:${log.event}${log.action ? `.${log.action}` : ""}`,
        statusCode: log.status === "FAILED" ? 400 : 200,
        issueKey: undefined,
        latencyMs: 35,
        timestamp: new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        summary: `${log.event}${log.action ? ` (${log.action})` : ""} on ${log.repositoryName || "repository"} by ${log.senderName || "user"}`,
      }));
    }

    if (repos.length === 0) {
      return {
        hasConnectedRepo: false,
        repos: [],
        webhookLogs,
        stats: {
          activeBranches: 0,
          openPRs: 0,
          mergedPRs: 0,
          pipelineStatus: "Idle",
          commits: [],
        },
      };
    }

    const primaryRepo = repos[0];
    const liveStats = await fetchGithubRepoStats(
      primaryRepo.owner,
      primaryRepo.repoName,
      primaryRepo.accessToken || undefined
    );

    const hasRealData =
      primaryRepo.branches.length > 0 ||
      primaryRepo.commits.length > 0 ||
      primaryRepo.pullRequests.length > 0 ||
      liveStats.commits.length > 0;

    return {
      hasConnectedRepo: hasRealData,
      repos: repos.map((r) => ({
        id: r.id,
        owner: r.owner,
        repoName: r.repoName,
        createdAt: r.createdAt,
      })),
      webhookLogs,
      stats: {
        activeBranches: primaryRepo.branches.length || liveStats.activeBranches,
        openPRs: primaryRepo.pullRequests.filter((p) => p.status === "OPEN").length || liveStats.openPRs,
        mergedPRs: primaryRepo.pullRequests.filter((p) => p.status === "MERGED").length || liveStats.mergedPRs,
        pipelineStatus: hasRealData ? liveStats.pipelineStatus : "Idle",
        commits: primaryRepo.commits.length > 0
          ? primaryRepo.commits.map((c) => ({
              hash: c.hash,
              message: c.message,
              author: c.authorName,
              avatarUrl: c.authorAvatar || undefined,
              committedAt: c.committedAt.toISOString(),
              url: c.url || `https://github.com/${primaryRepo.owner}/${primaryRepo.repoName}/commit/${c.hash}`,
            }))
          : liveStats.commits,
      },
    };
  } catch (e) {
    return {
      hasConnectedRepo: false,
      repos: [],
      webhookLogs: [],
      stats: {
        activeBranches: 0,
        openPRs: 0,
        mergedPRs: 0,
        pipelineStatus: "Idle",
        commits: [],
      },
    };
  }
}
