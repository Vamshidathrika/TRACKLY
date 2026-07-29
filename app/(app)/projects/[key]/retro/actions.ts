"use server";

import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth";
import { checkProjectAccess } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { createIssue } from "@/lib/issues";
import type { RetroColumn } from "@prisma/client";

// ─── Add Card ─────────────────────────────────────────────────────────────────

export async function addRetroCardAction(input: {
  sprintId: string;
  projectId: string;
  column: RetroColumn;
  text: string;
  isAnonymous: boolean;
}) {
  const user = await getAuthUser();
  const access = await checkProjectAccess(user.id, input.projectId);
  if (!access) return { error: "Access denied" };

  const text = input.text.trim();
  if (!text || text.length < 2) return { error: "Feedback text is too short" };
  if (text.length > 1000) return { error: "Feedback text is too long (max 1000 chars)" };

  const card = await prisma.retroCard.create({
    data: {
      sprintId: input.sprintId,
      projectId: input.projectId,
      column: input.column,
      text,
      authorId: user.id,
      isAnonymous: input.isAnonymous,
      // Give the author an automatic first vote on their own card
      votes: { create: { userId: user.id } },
    },
    include: {
      author: { select: { id: true, name: true } },
      votes: { select: { userId: true } },
    },
  });

  revalidatePath(`/projects`);

  return {
    success: true,
    card: {
      id: card.id,
      column: card.column,
      text: card.text,
      authorId: card.authorId,
      authorName: card.author.name,
      isAnonymous: card.isAnonymous,
      voteCount: card.votes.length,
      hasUserVoted: true,
      convertedIssueId: null,
      convertedIssueKey: null,
      assigneeId: null,
      assigneeName: null,
      createdAt: card.createdAt,
    },
  };
}

// ─── Delete Card ──────────────────────────────────────────────────────────────

export async function deleteRetroCardAction(cardId: string) {
  const user = await getAuthUser();

  const card = await prisma.retroCard.findUnique({
    where: { id: cardId },
    select: { authorId: true, projectId: true },
  });
  if (!card) return { error: "Card not found" };

  // Only the author can delete their own card
  if (card.authorId !== user.id) {
    return { error: "Only the card author can delete this card" };
  }

  await prisma.retroCard.delete({ where: { id: cardId } });
  revalidatePath(`/projects`);

  return { success: true };
}

// ─── Vote on Card ─────────────────────────────────────────────────────────────

export async function voteRetroCardAction(cardId: string): Promise<{ success: boolean; voteCount?: number; hasUserVoted?: boolean; error?: string }> {
  const user = await getAuthUser();

  const card = await prisma.retroCard.findUnique({
    where: { id: cardId },
    select: { projectId: true },
  });
  if (!card) return { success: false, error: "Card not found" };

  const access = await checkProjectAccess(user.id, card.projectId);
  if (!access) return { success: false, error: "Access denied" };

  try {
    // @@unique([cardId, userId]) enforces one vote per user at DB level
    await prisma.retroVote.create({
      data: { cardId, userId: user.id },
    });
  } catch {
    // Unique constraint violation = already voted — not an error, just return current state
  }

  const voteCount = await prisma.retroVote.count({ where: { cardId } });
  return { success: true, voteCount, hasUserVoted: true };
}

// ─── Un-vote on Card ──────────────────────────────────────────────────────────

export async function unvoteRetroCardAction(cardId: string): Promise<{ success: boolean; voteCount?: number; hasUserVoted?: boolean; error?: string }> {
  const user = await getAuthUser();

  await prisma.retroVote.deleteMany({
    where: { cardId, userId: user.id },
  });

  const voteCount = await prisma.retroVote.count({ where: { cardId } });
  return { success: true, voteCount, hasUserVoted: false };
}

// ─── Convert Action Item to Real Issue ───────────────────────────────────────

export async function convertRetroCardToIssueAction(
  cardId: string,
  assigneeId?: string | null
) {
  const user = await getAuthUser();

  const card = await prisma.retroCard.findUnique({
    where: { id: cardId },
    select: {
      id: true,
      text: true,
      projectId: true,
      convertedIssueId: true,
      sprint: { select: { id: true } },
    },
  });

  if (!card) return { error: "Card not found" };
  if (card.convertedIssueId) return { error: "Already converted to an issue" };

  const access = await checkProjectAccess(user.id, card.projectId);
  if (!access) return { error: "Access denied" };

  // Create the real issue in the backlog
  const issue = await createIssue({
    projectId: card.projectId,
    summary: card.text,
    reporterId: user.id,
    assigneeId: assigneeId ?? undefined,
    status: "TO_DO",
    type: "TASK",
  });

  // Store the real issue ID back on the retro card
  await prisma.retroCard.update({
    where: { id: cardId },
    data: {
      convertedIssueId: issue.id,
      assigneeId: assigneeId ?? null,
    },
  });

  revalidatePath(`/projects`);

  return {
    success: true,
    issueId: issue.id,
    issueKey: issue.key,
  };
}

// ─── AI Synthesize Action Items ───────────────────────────────────────────────

export async function aiSynthesizeRetroAction(input: {
  sprintId: string;
  projectId: string;
  needsImprovementCards: string[];
  wentWellCards: string[];
}) {
  const user = await getAuthUser();
  const access = await checkProjectAccess(user.id, input.projectId);
  if (!access) return { error: "Access denied" };

  if (input.needsImprovementCards.length === 0) {
    return { error: "No 'Needs Improvement' items to synthesize from" };
  }

  const verbs = ["Implement", "Set up", "Establish", "Automate", "Optimize", "Streamline"];
  const suggestions: string[] = input.needsImprovementCards.slice(0, 3).map((item: string, idx: number) => {
    const cleanItem = item.replace(/^[\d\-\.\*]+\s*/, "").trim();
    const verb = verbs[idx % verbs.length];
    return `${verb} process to address: ${cleanItem.charAt(0).toLowerCase() + cleanItem.slice(1)}`;
  });

  try {
    // Create real RetroCard rows for each AI suggestion
    const createdCards = await Promise.all(
      suggestions.map((text: string) =>
        prisma.retroCard.create({
          data: {
            sprintId: input.sprintId,
            projectId: input.projectId,
            column: "ACTION_ITEMS",
            text,
            authorId: user.id,
            isAnonymous: false,
            votes: { create: { userId: user.id } },
          },
          include: {
            author: { select: { id: true, name: true } },
            votes: { select: { userId: true } },
          },
        })
      )
    );

    revalidatePath(`/projects`);

    return {
      success: true,
      cards: createdCards.map((card) => ({
        id: card.id,
        column: card.column as RetroColumn,
        text: card.text,
        authorId: card.authorId,
        authorName: "✨ Rovo AI",
        isAnonymous: false,
        voteCount: card.votes.length,
        hasUserVoted: true,
        convertedIssueId: null,
        convertedIssueKey: null,
        assigneeId: null,
        assigneeName: null,
        createdAt: card.createdAt,
      })),
    };
  } catch (err) {
    console.error("[aiSynthesizeRetroAction]", err);
    return { error: "AI synthesis failed." };
  }
}
