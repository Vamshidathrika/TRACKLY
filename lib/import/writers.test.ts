import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../prisma", () => ({
  prisma: {
    comment: { findMany: vi.fn(), createMany: vi.fn() },
    workLog: { findMany: vi.fn(), createMany: vi.fn() },
    issueHistory: { findMany: vi.fn(), createMany: vi.fn() },
    attachment: { findMany: vi.fn(), createMany: vi.fn() },
  },
}));

import { prisma } from "../prisma";
import { writeIssueChildren, chunk } from "./writers";
import type { UserResolver } from "./users";
import type { NormalizedIssue } from "./types";

function fakeResolver(authorId = "author-1"): UserResolver {
  return { resolveRequired: () => authorId } as unknown as UserResolver;
}

function baseIssue(overrides: Partial<NormalizedIssue> = {}): NormalizedIssue {
  return {
    sourceRow: 1,
    jiraKey: "ACME-1",
    jiraProjectKey: "ACME",
    jiraNumber: 1,
    summary: "x",
    description: null,
    typeName: null,
    isSubtask: false,
    statusName: null,
    statusCategoryKey: null,
    priorityName: null,
    storyPoints: null,
    originalEstimateSeconds: null,
    reporter: null,
    assignee: null,
    parentKey: null,
    labels: [],
    components: [],
    createdAt: null,
    updatedAt: null,
    startDate: null,
    dueDate: null,
    sprints: [],
    comments: [],
    workLogs: [],
    history: [],
    attachments: [],
    links: [],
    customFields: [],
    ...overrides,
  };
}

describe("chunk", () => {
  it("splits an array into batches of the given size", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("returns a single batch when items fit within the size", () => {
    expect(chunk([1, 2], 5)).toEqual([[1, 2]]);
  });
});

describe("writeIssueChildren — comments", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a comment that does not already exist", async () => {
    (prisma.comment.findMany as any).mockResolvedValue([]);
    (prisma.workLog.findMany as any).mockResolvedValue([]);
    (prisma.issueHistory.findMany as any).mockResolvedValue([]);
    (prisma.attachment.findMany as any).mockResolvedValue([]);

    const createdAt = new Date("2024-01-01T00:00:00Z");
    const target = { issueId: "issue-1", source: baseIssue({ comments: [{ author: null, body: "hi", createdAt }] }) };

    const counts = await writeIssueChildren([target], fakeResolver(), true);

    expect(counts.comments).toEqual({ created: 1, updated: 0, skipped: 0 });
    expect(prisma.comment.createMany).toHaveBeenCalledWith({
      data: [{ issueId: "issue-1", authorId: "author-1", body: "hi", createdAt }],
    });
  });

  it("skips a comment that already exists (matched by issue + author + timestamp + body)", async () => {
    const createdAt = new Date("2024-01-01T00:00:00Z");
    (prisma.comment.findMany as any).mockResolvedValue([
      { issueId: "issue-1", authorId: "author-1", body: "hi", createdAt },
    ]);
    (prisma.workLog.findMany as any).mockResolvedValue([]);
    (prisma.issueHistory.findMany as any).mockResolvedValue([]);
    (prisma.attachment.findMany as any).mockResolvedValue([]);

    const target = { issueId: "issue-1", source: baseIssue({ comments: [{ author: null, body: "hi", createdAt }] }) };
    const counts = await writeIssueChildren([target], fakeResolver(), true);

    expect(counts.comments).toEqual({ created: 0, updated: 0, skipped: 1 });
    expect(prisma.comment.createMany).not.toHaveBeenCalled();
  });

  it("does not write anything when write=false (dry run), but still counts", async () => {
    (prisma.comment.findMany as any).mockResolvedValue([]);
    (prisma.workLog.findMany as any).mockResolvedValue([]);
    (prisma.issueHistory.findMany as any).mockResolvedValue([]);
    (prisma.attachment.findMany as any).mockResolvedValue([]);

    const target = {
      issueId: "issue-1",
      source: baseIssue({ comments: [{ author: null, body: "hi", createdAt: new Date() }] }),
    };
    const counts = await writeIssueChildren([target], fakeResolver(), false);

    expect(counts.comments.created).toBe(1);
    expect(prisma.comment.createMany).not.toHaveBeenCalled();
  });
});

describe("writeIssueChildren — work logs", () => {
  beforeEach(() => vi.clearAllMocks());

  it("converts seconds to hours and skips zero-length entries", async () => {
    (prisma.comment.findMany as any).mockResolvedValue([]);
    (prisma.workLog.findMany as any).mockResolvedValue([]);
    (prisma.issueHistory.findMany as any).mockResolvedValue([]);
    (prisma.attachment.findMany as any).mockResolvedValue([]);

    const target = {
      issueId: "issue-1",
      source: baseIssue({
        workLogs: [
          { author: null, seconds: 3600, startedAt: new Date("2024-01-01T00:00:00Z") },
          { author: null, seconds: 0, startedAt: new Date("2024-01-02T00:00:00Z") },
        ],
      }),
    };
    const counts = await writeIssueChildren([target], fakeResolver(), true);

    expect(counts.workLogs.created).toBe(1);
    expect(counts.workLogs.skipped).toBe(1);
    expect(prisma.workLog.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ hours: 1 })],
    });
  });
});

describe("writeIssueChildren — attachments", () => {
  beforeEach(() => vi.clearAllMocks());

  it("clamps a negative or fractional size to a non-negative integer", async () => {
    (prisma.comment.findMany as any).mockResolvedValue([]);
    (prisma.workLog.findMany as any).mockResolvedValue([]);
    (prisma.issueHistory.findMany as any).mockResolvedValue([]);
    (prisma.attachment.findMany as any).mockResolvedValue([]);

    const target = {
      issueId: "issue-1",
      source: baseIssue({
        attachments: [
          {
            uploader: null,
            filename: "a.png",
            url: "https://x/a.png",
            mimeType: "image/png",
            sizeBytes: -5,
            createdAt: new Date(),
          },
        ],
      }),
    };
    await writeIssueChildren([target], fakeResolver(), true);

    expect(prisma.attachment.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ sizeBytes: 0 })],
    });
  });
});
