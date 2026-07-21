import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./prisma", () => ({
  prisma: {
    automationRule: { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    issue: { update: vi.fn() },
    comment: { create: vi.fn() },
  },
}));
import { prisma } from "./prisma";
import { createAutomationRule, toggleAutomationRule, evaluateAutomationTriggers } from "./automation";

describe("automation engine", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates an automation rule", async () => {
    (prisma.automationRule.create as any).mockResolvedValue({
      id: "r1",
      name: "Auto-assign on In Review",
      eventTrigger: "STATUS_CHANGED",
      action: "ASSIGN_USER",
      targetValue: "u123",
      enabled: true,
    });

    const rule = await createAutomationRule({
      projectId: "p1",
      name: "Auto-assign on In Review",
      eventTrigger: "STATUS_CHANGED",
      action: "ASSIGN_USER",
      targetValue: "u123",
    });

    expect(rule.name).toBe("Auto-assign on In Review");
    expect(rule.enabled).toBe(true);
  });

  it("evaluates and executes ADD_COMMENT automation trigger", async () => {
    (prisma.automationRule.findMany as any).mockResolvedValue([
      {
        id: "r1",
        eventTrigger: "ISSUE_CREATED",
        action: "ADD_COMMENT",
        targetValue: "Welcome to this issue!",
        enabled: true,
      },
    ]);

    await evaluateAutomationTriggers("ISSUE_CREATED", {
      issueId: "i1",
      projectId: "p1",
      authorId: "u1",
    });

    expect(prisma.comment.create).toHaveBeenCalledWith({
      data: {
        issueId: "i1",
        authorId: "u1",
        body: "Welcome to this issue!",
      },
    });
  });
});
