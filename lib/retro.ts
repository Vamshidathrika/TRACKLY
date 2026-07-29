/**
 * Retro Data Access Layer
 * Pure Prisma queries — no "use server", no side effects.
 * Used by both Server Actions and the retro page Server Component.
 */

import { prisma } from "./prisma";
import type { RetroColumn } from "@prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RetroCardData {
  id: string;
  column: RetroColumn;
  text: string;
  authorId: string;
  authorName: string;
  isAnonymous: boolean;
  voteCount: number;
  hasUserVoted: boolean;
  convertedIssueId: string | null;
  convertedIssueKey: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  createdAt: Date;
}

export interface SprintHealthSummary {
  sprintName: string;
  totalIssues: number;
  doneCount: number;
  completionPct: number;
  totalStoryPoints: number;
  doneStoryPoints: number;
  blockedCount: number;
  avgCycleTimeHours: number | null;
  startDate: Date | null;
  endDate: Date | null;
}

export interface SprintOption {
  id: string;
  name: string;
  status: string;
  endDate: Date | null;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/** Fetch all retro cards for a sprint, enriched with vote data for a given user */
export async function getRetroCards(
  sprintId: string,
  currentUserId: string
): Promise<RetroCardData[]> {
  const cards = await prisma.retroCard.findMany({
    where: { sprintId },
    include: {
      author: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
      votes: { select: { userId: true } },
      // Fetch the converted issue key if one exists
    },
    orderBy: { createdAt: "asc" },
  });

  // Resolve convertedIssueKey for cards that were converted
  const convertedIssueIds = cards
    .map((c) => c.convertedIssueId)
    .filter((id): id is string => id !== null);

  const convertedIssues =
    convertedIssueIds.length > 0
      ? await prisma.issue.findMany({
          where: { id: { in: convertedIssueIds } },
          select: { id: true, key: true },
        })
      : [];

  const issueKeyMap = new Map(convertedIssues.map((i) => [i.id, i.key]));

  return cards.map((card) => ({
    id: card.id,
    column: card.column,
    text: card.text,
    authorId: card.authorId,
    authorName: card.author.name,
    isAnonymous: card.isAnonymous,
    voteCount: card.votes.length,
    hasUserVoted: card.votes.some((v) => v.userId === currentUserId),
    convertedIssueId: card.convertedIssueId,
    convertedIssueKey: card.convertedIssueId
      ? (issueKeyMap.get(card.convertedIssueId) ?? null)
      : null,
    assigneeId: card.assigneeId,
    assigneeName: card.assignee?.name ?? null,
    createdAt: card.createdAt,
  }));
}

/** Get real sprint health statistics for the summary panel */
export async function getSprintHealthSummary(
  sprintId: string
): Promise<SprintHealthSummary | null> {
  const sprint = await prisma.sprint.findUnique({
    where: { id: sprintId },
    include: {
      issues: {
        select: {
          id: true,
          status: true,
          priority: true,
          storyPoints: true,
          createdAt: true,
          updatedAt: true,
          workLogs: {
            select: { createdAt: true },
            orderBy: { createdAt: "asc" },
            take: 1,
          },
        },
      },
    },
  });

  if (!sprint) return null;

  const issues = sprint.issues;
  const totalIssues = issues.length;
  const doneIssues = issues.filter((i) => i.status === "DONE");
  const doneCount = doneIssues.length;
  const completionPct =
    totalIssues > 0 ? Math.round((doneCount / totalIssues) * 100) : 0;

  const totalStoryPoints = issues.reduce((s, i) => s + (i.storyPoints ?? 0), 0);
  const doneStoryPoints = doneIssues.reduce(
    (s, i) => s + (i.storyPoints ?? 0),
    0
  );

  const blockedCount = issues.filter(
    (i) =>
      i.priority === "HIGHEST" &&
      (i.status === "TO_DO" || i.status === "IN_PROGRESS")
  ).length;

  // Cycle time: first worklog → DONE for completed issues
  const cycleTimes = doneIssues
    .map((i) => {
      const firstWl = i.workLogs[0]?.createdAt;
      if (!firstWl) return null;
      return Math.max(
        0,
        Math.round((i.updatedAt.getTime() - firstWl.getTime()) / 3_600_000)
      );
    })
    .filter((v): v is number => v !== null);

  const avgCycleTimeHours =
    cycleTimes.length > 0
      ? Math.round(cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length)
      : null;

  return {
    sprintName: sprint.name,
    totalIssues,
    doneCount,
    completionPct,
    totalStoryPoints,
    doneStoryPoints,
    blockedCount,
    avgCycleTimeHours,
    startDate: sprint.startDate,
    endDate: sprint.endDate,
  };
}

/** Get the list of sprints available for retro (CLOSED + ACTIVE) */
export async function getRetroSprintOptions(
  projectId: string
): Promise<SprintOption[]> {
  const sprints = await prisma.sprint.findMany({
    where: {
      projectId,
      status: { in: ["CLOSED", "ACTIVE"] },
    },
    select: { id: true, name: true, status: true, endDate: true },
    orderBy: { createdAt: "desc" },
  });

  return sprints.map((s) => ({
    id: s.id,
    name: s.name,
    status: s.status,
    endDate: s.endDate,
  }));
}
