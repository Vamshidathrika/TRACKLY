"use server";

import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchGithubRepoStats } from "@/lib/github";

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

    const repo = await prisma.gitRepository.upsert({
      where: {
        projectId_owner_repoName: {
          projectId: input.projectId,
          owner,
          repoName,
        },
      },
      create: {
        siteId: project.siteId,
        projectId: input.projectId,
        owner,
        repoName,
        accessToken: input.accessToken?.trim() || null,
      },
      update: {
        accessToken: input.accessToken?.trim() || null,
      },
    });

    revalidatePath("/projects");
    return { success: true, repo };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    return { error: "Could not connect repository" };
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
    const repos = await prisma.gitRepository.findMany({
      where: { projectId },
      include: {
        commits: { orderBy: { committedAt: "desc" }, take: 10 },
        pullRequests: { orderBy: { createdAt: "desc" } },
        branches: true,
      },
    });

    if (repos.length === 0) {
      return {
        hasConnectedRepo: false,
        repos: [],
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

    return {
      hasConnectedRepo: true,
      repos: repos.map((r) => ({
        id: r.id,
        owner: r.owner,
        repoName: r.repoName,
        createdAt: r.createdAt,
      })),
      stats: {
        activeBranches: primaryRepo.branches.length || liveStats.activeBranches,
        openPRs: primaryRepo.pullRequests.filter((p) => p.status === "OPEN").length || liveStats.openPRs,
        mergedPRs: primaryRepo.pullRequests.filter((p) => p.status === "MERGED").length || liveStats.mergedPRs,
        pipelineStatus: liveStats.pipelineStatus,
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
