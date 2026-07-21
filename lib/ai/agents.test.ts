import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../prisma", () => ({
  prisma: {
    project: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    membership: { findMany: vi.fn(), findFirst: vi.fn() },
    sprint: { findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    issue: { findMany: vi.fn(), create: vi.fn(), update: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn() },
    comment: { create: vi.fn() },
  },
}));

vi.mock("./knowledgeBase", () => ({
  getPlatformKnowledgeBase: vi.fn().mockResolvedValue({
    projects: [{ id: "p1", name: "Demo Project", key: "DEMO" }],
    members: [{ id: "u1", name: "Demo User", email: "demo@trackly.dev" }],
    sprints: [{ id: "s1", name: "Sprint 1", status: "ACTIVE", projectId: "p1" }],
    issues: [{ id: "i1", key: "DEMO-1", summary: "Initial Issue", status: "TO_DO" }],
  }),
}));

vi.mock("../issues", () => ({
  createIssue: vi.fn().mockResolvedValue({ key: "DEMO-2", summary: "New task summary" }),
  updateIssue: vi.fn().mockResolvedValue({ id: "i1", status: "DONE" }),
  addComment: vi.fn().mockResolvedValue({ id: "c1", body: "WIP comment" }),
}));

vi.mock("../sprints", () => ({
  createSprint: vi.fn().mockResolvedValue({ id: "s2", name: "Sprint 2" }),
  moveIssueToSprint: vi.fn().mockResolvedValue({ id: "i1", sprintId: "s2" }),
}));

import { prisma } from "../prisma";
import { executeAgentCommand } from "./ticketAgent";

describe("autonomous ticket agent", () => {
  beforeEach(() => vi.clearAllMocks());

  it("handles create issue command", async () => {
    const res = await executeAgentCommand("u1", "s1", 'create issue "New task summary"');
    expect(res.success).toBe(true);
    expect(res.actionTaken).toBe("CREATE_ISSUE");
    expect(res.message).toContain("DEMO-2");
  });

  it("handles update status command", async () => {
    (prisma.issue.findFirst as any).mockResolvedValue({ id: "i1", key: "DEMO-1", status: "TO_DO" });
    const res = await executeAgentCommand("u1", "s1", "move DEMO-1 to done");
    expect(res.success).toBe(true);
    expect(res.actionTaken).toBe("UPDATE_STATUS");
  });

  it("handles assign issue command", async () => {
    (prisma.issue.findFirst as any).mockResolvedValue({ id: "i1", key: "DEMO-1" });
    const res = await executeAgentCommand("u1", "s1", "assign DEMO-1 to Demo User");
    expect(res.success).toBe(true);
    expect(res.actionTaken).toBe("ASSIGN_ISSUE");
  });

  it("handles comment command", async () => {
    (prisma.issue.findFirst as any).mockResolvedValue({ id: "i1", key: "DEMO-1" });
    const res = await executeAgentCommand("u1", "s1", 'comment on DEMO-1 "Checking work"');
    expect(res.success).toBe(true);
    expect(res.actionTaken).toBe("ADD_COMMENT");
  });
});
