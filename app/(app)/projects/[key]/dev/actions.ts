"use server";

import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchGithubRepoStats, validateAndSyncGithubRepo } from "@/lib/github";

export async function connectGithubRepoAction(input: {
  projectId: string;
  owner: string;
  repoName: string;
  accessToken?: string;
}) {
  await getAuthUser();
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
  await getAuthUser();
  try {
    const repo = await prisma.gitRepository.findUnique({
      where: { id: repositoryId },
    });
    if (!repo) return { error: "Repository not found" };

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
  await getAuthUser();
  try {
    const existing = await prisma.gitRepository.findUnique({
      where: { id: input.repositoryId },
    });
    if (!existing) return { error: "Repository not found" };

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
  await getAuthUser();
  try {
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

export async function fetchDevDashboardDataAction(projectId: string) {
  await getAuthUser();
  try {
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
