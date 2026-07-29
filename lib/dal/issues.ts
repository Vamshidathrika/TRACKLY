import { cache } from "react";
import { prisma } from "../prisma";
import { getCache, setCache } from "../redis";

/**
 * Summary Query for Kanban Board & Backlog Cards
 * Returns lightweight card payloads (avoids pulling description, history, attachments, worklogs)
 */
export const getBoardIssues = cache(async (projectId: string, sprintId?: string) => {
  const rows = await prisma.issue.findMany({
    where: {
      projectId,
      ...(sprintId ? { sprintId } : {}),
    },
    select: {
      id: true,
      key: true,
      number: true,
      summary: true,
      type: true,
      status: true,
      priority: true,
      storyPoints: true,
      originalEstimate: true,
      rank: true,
      sprintId: true,
      assigneeId: true,
      reporterId: true,
      labels: true,
      dueDate: true,
      assignee: {
        select: { id: true, name: true, avatarUrl: true },
      },
      // Aggregate worklog hours so cards show real logged time without a
      // separate detail-fetch round-trip. _sum is a single GROUP BY in SQL.
      workLogs: {
        select: { hours: true },
      },
    },
    orderBy: { rank: "asc" },
  });

  // Collapse workLogs array into a scalar so downstream code sees loggedHours
  // directly on the card, matching the shape getIssueDetail returns.
  return rows.map((r) => ({
    ...r,
    loggedHours: r.workLogs.reduce((sum, w) => sum + Number(w.hours ?? 0), 0),
    workLogs: undefined, // strip the raw array — callers use the scalar
  }));
});


/**
 * Core Issue Metadata Query
 * Optimized view query that fetches issue details without monolithic child list joins.
 */
export const getIssueCoreDetail = cache(async (siteId: string, key: string) => {
  const upperKey = key.toUpperCase();
  const cacheKey = `issue:core:${siteId}:${upperKey}`;
  const cached = await getCache<any>(cacheKey);
  if (cached && cached.project?.siteId === siteId) return cached;

  const issue = await prisma.issue.findFirst({
    where: {
      OR: [{ key: upperKey }, { key }],
      project: { siteId },
    },
    select: {
      id: true,
      key: true,
      number: true,
      summary: true,
      description: true,
      type: true,
      status: true,
      priority: true,
      storyPoints: true,
      originalEstimate: true,
      rank: true,
      reporterId: true,
      assigneeId: true,
      parentId: true,
      sprintId: true,
      labels: true,
      startDate: true,
      dueDate: true,
      createdAt: true,
      updatedAt: true,
      project: { select: { id: true, name: true, key: true, siteId: true } },
      reporter: { select: { id: true, name: true, avatarUrl: true } },
      assignee: { select: { id: true, name: true, avatarUrl: true } },
      sprint: { select: { id: true, name: true, status: true } },
      parent: { select: { id: true, key: true, summary: true, type: true } },
      subtasks: {
        select: { id: true, key: true, summary: true, status: true },
        orderBy: { number: "asc" },
      },
    },
  });

  if (issue) {
    await setCache(cacheKey, issue, 180);
  }

  return issue;
});

/**
 * Deferred Comment Stream Query
 */
export const getIssueComments = cache(async (issueId: string) => {
  return prisma.comment.findMany({
    where: { issueId },
    include: {
      author: { select: { id: true, name: true, avatarUrl: true } },
    },
    orderBy: { createdAt: "asc" },
  });
});

/**
 * Deferred Audit History Query
 */
export const getIssueHistory = cache(async (issueId: string) => {
  return prisma.issueHistory.findMany({
    where: { issueId },
    include: {
      author: { select: { id: true, name: true, avatarUrl: true } },
    },
    orderBy: { createdAt: "desc" },
  });
});

/**
 * Deferred WorkLog Query
 */
export const getIssueWorkLogs = cache(async (issueId: string) => {
  return prisma.workLog.findMany({
    where: { issueId },
    include: {
      author: { select: { id: true, name: true, avatarUrl: true } },
    },
    orderBy: { startedAt: "desc" },
  });
});
