import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./prisma", () => ({
  prisma: {
    project: { findUnique: vi.fn(), update: vi.fn() },
    issue: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    comment: { create: vi.fn() },
    issueHistory: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));
import { prisma } from "./prisma";
import { createIssue, addComment } from "./issues";

describe("issues lib", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates issue with auto-increment key TRK-1", async () => {
    (prisma.$transaction as any).mockImplementation(async (fn: any) =>
      fn({
        project: {
          findUnique: vi.fn().mockResolvedValue({ id: "p1", key: "TRK", issueCounter: 0 }),
          update: vi.fn().mockResolvedValue({ id: "p1", issueCounter: 1 }),
        },
        issue: {
          create: vi.fn().mockResolvedValue({ id: "i1", key: "TRK-1", number: 1, summary: "Test Issue" }),
        },
      })
    );

    const issue = await createIssue({
      projectId: "p1",
      summary: "Test Issue",
      reporterId: "u1",
      type: "STORY",
      priority: "MEDIUM",
    });

    expect(issue.key).toBe("TRK-1");
  });

  it("adds comment to issue", async () => {
    (prisma.comment.create as any).mockResolvedValue({ id: "c1", body: "Hello world" });
    const c = await addComment({ issueId: "i1", authorId: "u1", body: "Hello world" });
    expect(c.body).toBe("Hello world");
  });
});
