import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./prisma", () => ({
  prisma: {
    retroCard: { findMany: vi.fn() },
    retroVote: { create: vi.fn(), delete: vi.fn(), findUnique: vi.fn() },
    issue: { findMany: vi.fn() },
    sprint: { findUnique: vi.fn(), findMany: vi.fn() },
  },
}));

import { prisma } from "./prisma";
import { getRetroCards, getSprintHealthSummary, getRetroSprintOptions } from "./retro";

const NOW = new Date("2026-07-29T10:00:00Z");
const HOUR = 3_600_000;

describe("Retro Data Layer", () => {
  beforeEach(() => vi.clearAllMocks());

  // ─── getRetroCards ───────────────────────────────────────────────────────────

  it("returns enriched retro cards with vote count and hasUserVoted flag", async () => {
    (prisma.retroCard.findMany as any).mockResolvedValue([
      {
        id: "card-1",
        column: "WENT_WELL",
        text: "Great sprint velocity!",
        authorId: "user-1",
        isAnonymous: false,
        convertedIssueId: null,
        assigneeId: null,
        createdAt: NOW,
        author: { id: "user-1", name: "Alice" },
        assignee: null,
        votes: [{ userId: "user-1" }, { userId: "user-2" }],
      },
    ]);
    (prisma.issue.findMany as any).mockResolvedValue([]);

    const cards = await getRetroCards("sprint-1", "user-1");
    expect(cards).toHaveLength(1);
    expect(cards[0].voteCount).toBe(2);
    expect(cards[0].hasUserVoted).toBe(true);
    expect(cards[0].authorName).toBe("Alice");
  });

  it("sets hasUserVoted false when current user has not voted", async () => {
    (prisma.retroCard.findMany as any).mockResolvedValue([
      {
        id: "card-2",
        column: "NEEDS_IMPROVEMENT",
        text: "Standups ran too long",
        authorId: "user-2",
        isAnonymous: false,
        convertedIssueId: null,
        assigneeId: null,
        createdAt: NOW,
        author: { id: "user-2", name: "Bob" },
        assignee: null,
        votes: [{ userId: "user-2" }],
      },
    ]);
    (prisma.issue.findMany as any).mockResolvedValue([]);

    const cards = await getRetroCards("sprint-1", "user-1");
    expect(cards[0].hasUserVoted).toBe(false);
    expect(cards[0].voteCount).toBe(1);
  });

  it("resolves convertedIssueKey from issue table for converted cards", async () => {
    (prisma.retroCard.findMany as any).mockResolvedValue([
      {
        id: "card-3",
        column: "ACTION_ITEMS",
        text: "Set up regression alerts",
        authorId: "user-1",
        isAnonymous: false,
        convertedIssueId: "issue-abc",
        assigneeId: null,
        createdAt: NOW,
        author: { id: "user-1", name: "Alice" },
        assignee: null,
        votes: [],
      },
    ]);
    (prisma.issue.findMany as any).mockResolvedValue([
      { id: "issue-abc", key: "TRK-42" },
    ]);

    const cards = await getRetroCards("sprint-1", "user-1");
    expect(cards[0].convertedIssueKey).toBe("TRK-42");
  });

  it("returns empty array when no retro cards exist", async () => {
    (prisma.retroCard.findMany as any).mockResolvedValue([]);
    (prisma.issue.findMany as any).mockResolvedValue([]);
    const cards = await getRetroCards("sprint-1", "user-1");
    expect(cards).toHaveLength(0);
  });

  // ─── getSprintHealthSummary ──────────────────────────────────────────────────

  it("calculates sprint health summary correctly", async () => {
    const firstWl = new Date(NOW.getTime() - 12 * HOUR);
    (prisma.sprint.findUnique as any).mockResolvedValue({
      id: "sprint-1",
      name: "Sprint 7",
      startDate: new Date(NOW.getTime() - 14 * 24 * HOUR),
      endDate: NOW,
      issues: [
        {
          id: "i1",
          status: "DONE",
          priority: "HIGH",
          storyPoints: 5,
          createdAt: new Date(NOW.getTime() - 14 * 24 * HOUR),
          updatedAt: NOW,
          workLogs: [{ createdAt: firstWl }],
        },
        {
          id: "i2",
          status: "TO_DO",
          priority: "HIGHEST",
          storyPoints: 3,
          createdAt: new Date(NOW.getTime() - 14 * 24 * HOUR),
          updatedAt: NOW,
          workLogs: [],
        },
        {
          id: "i3",
          status: "DONE",
          priority: "MEDIUM",
          storyPoints: 2,
          createdAt: new Date(NOW.getTime() - 14 * 24 * HOUR),
          updatedAt: NOW,
          workLogs: [{ createdAt: firstWl }],
        },
      ],
    });

    const summary = await getSprintHealthSummary("sprint-1");
    expect(summary).not.toBeNull();
    expect(summary!.sprintName).toBe("Sprint 7");
    expect(summary!.totalIssues).toBe(3);
    expect(summary!.doneCount).toBe(2);
    expect(summary!.completionPct).toBe(67);
    expect(summary!.totalStoryPoints).toBe(10);
    expect(summary!.doneStoryPoints).toBe(7);
    expect(summary!.blockedCount).toBe(1);
    expect(summary!.avgCycleTimeHours).toBe(12);
  });

  it("returns null for non-existent sprint", async () => {
    (prisma.sprint.findUnique as any).mockResolvedValue(null);
    const summary = await getSprintHealthSummary("ghost-sprint");
    expect(summary).toBeNull();
  });

  it("handles null avgCycleTime when no worklogs exist", async () => {
    (prisma.sprint.findUnique as any).mockResolvedValue({
      id: "sprint-2",
      name: "Sprint 8",
      startDate: null,
      endDate: null,
      issues: [
        {
          id: "i4",
          status: "DONE",
          priority: "LOW",
          storyPoints: 1,
          createdAt: NOW,
          updatedAt: NOW,
          workLogs: [],
        },
      ],
    });
    const summary = await getSprintHealthSummary("sprint-2");
    expect(summary!.avgCycleTimeHours).toBeNull();
  });

  // ─── getRetroSprintOptions ───────────────────────────────────────────────────

  it("returns CLOSED and ACTIVE sprint options ordered by date", async () => {
    (prisma.sprint.findMany as any).mockResolvedValue([
      { id: "sp1", name: "Sprint 7", status: "CLOSED", endDate: new Date("2026-07-15") },
      { id: "sp2", name: "Sprint 8", status: "ACTIVE", endDate: null },
    ]);

    const options = await getRetroSprintOptions("proj-1");
    expect(options).toHaveLength(2);
    expect(options[0].name).toBe("Sprint 7");
    expect(options[1].status).toBe("ACTIVE");
  });
});
