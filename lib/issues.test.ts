import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./prisma", () => ({
  prisma: {
    project: { findUnique: vi.fn(), update: vi.fn() },
    issue: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn(), findUnique: vi.fn(), delete: vi.fn(), aggregate: vi.fn() },
    comment: { create: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
    issueHistory: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));
import { prisma } from "./prisma";
import { createIssue, addComment, deleteIssue, deleteComment } from "./issues";

describe("issues lib", () => {
  beforeEach(() => vi.clearAllMocks());

  it("recovers when issueCounter has drifted behind the real issue numbers", async () => {
    // A project seeded with issues 1 and 2 but issueCounter still 0. The
    // in-transaction increment cannot fix this on its own: the P2002 rolls the
    // increment back, so every attempt re-picks the same number. The counter
    // has to be repaired outside the transaction between attempts.
    let issueCounter = 0;
    const taken = new Set([1, 2]);

    (prisma.issue.aggregate as any).mockImplementation(async () => ({ _max: { number: 2 } }));
    (prisma.project.update as any).mockImplementation(async ({ data }: any) => {
      issueCounter = data.issueCounter;
      return { id: "p1", issueCounter };
    });

    (prisma.$transaction as any).mockImplementation(async (fn: any) => {
      const snapshot = issueCounter;
      try {
        return await fn({
          project: {
            findUnique: vi.fn().mockResolvedValue({ id: "p1", key: "TRK" }),
            update: vi.fn().mockImplementation(async () => {
              issueCounter += 1;
              return { issueCounter };
            }),
          },
          issue: {
            create: vi.fn().mockImplementation(async ({ data }: any) => {
              if (taken.has(data.number)) {
                const err: any = new Error("Unique constraint failed");
                err.code = "P2002";
                throw err;
              }
              return { id: "i3", key: data.key, number: data.number };
            }),
          },
          issueHistory: { create: vi.fn().mockResolvedValue({ id: "h1" }) },
        });
      } catch (e) {
        issueCounter = snapshot; // transaction rollback reverts the increment
        throw e;
      }
    });

    const issue = await createIssue({ projectId: "p1", summary: "First real task", reporterId: "u1" });

    expect(issue.number).toBe(3);
    expect(issue.key).toBe("TRK-3");
  });

  it("creates issue with auto-increment key TRK-1", async () => {
    (prisma.$transaction as any).mockImplementation(async (fn: any) =>
      fn({
        project: {
          findUnique: vi.fn().mockResolvedValue({ id: "p1", key: "TRK", issueCounter: 0 }),
          update: vi.fn().mockResolvedValue({ id: "p1", issueCounter: 1 }),
        },
        issue: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({ id: "i1", key: "TRK-1", number: 1, summary: "Test Issue" }),
        },
        issueHistory: {
          create: vi.fn().mockResolvedValue({ id: "h1" }),
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

  it("deletes issue and returns projectKey", async () => {
    (prisma.issue.findUnique as any).mockResolvedValue({
      id: "i1",
      key: "TRK-1",
      summary: "ToDelete",
      project: { key: "TRK" },
    });
    (prisma.issueHistory.create as any).mockResolvedValue({ id: "h1" });
    (prisma.issue.delete as any).mockResolvedValue({ id: "i1" });

    const res = await deleteIssue("i1", "u1");
    expect(res.success).toBe(true);
    expect(res.projectKey).toBe("TRK");
  });

  it("deletes comment cleanly", async () => {
    (prisma.comment.findUnique as any).mockResolvedValue({
      id: "c1",
      authorId: "u1",
      issue: { key: "TRK-1", projectId: "p1" },
    });
    (prisma.project.findUnique as any).mockResolvedValue({ id: "p1", siteId: "s1" });
    (prisma.comment.delete as any).mockResolvedValue({ id: "c1" });

    const res = await deleteComment("c1", "u1");
    expect(res.success).toBe(true);
  });

  it("creates issue with custom original estimate", async () => {
    const mockTxCreate = vi.fn().mockImplementation(({ data }) =>
      Promise.resolve({ id: "i2", key: "TRK-2", number: 2, summary: "Estimated Task", originalEstimate: data.originalEstimate })
    );

    (prisma.$transaction as any).mockImplementation(async (fn: any) =>
      fn({
        project: {
          findUnique: vi.fn().mockResolvedValue({ id: "p1", key: "TRK", issueCounter: 1 }),
          update: vi.fn().mockResolvedValue({ id: "p1", issueCounter: 2 }),
        },
        issue: { findFirst: vi.fn().mockResolvedValue(null), create: mockTxCreate },
        issueHistory: { create: vi.fn().mockResolvedValue({ id: "h2" }) },
      })
    );

    const issue = await createIssue({
      projectId: "p1",
      summary: "Estimated Task",
      reporterId: "u1",
      originalEstimate: 12.5,
    });

    expect(issue.originalEstimate).toBe(12.5);
    expect(mockTxCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ originalEstimate: 12.5 }),
      })
    );
  });
});
