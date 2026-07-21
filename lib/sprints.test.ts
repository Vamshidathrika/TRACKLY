import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./prisma", () => ({
  prisma: {
    sprint: { create: vi.fn(), findMany: vi.fn(), update: vi.fn(), findUnique: vi.fn() },
    issue: { update: vi.fn(), updateMany: vi.fn() },
  },
}));
import { prisma } from "./prisma";
import { createSprint, startSprint, completeSprint, moveIssueToSprint } from "./sprints";

describe("sprints lib", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates future sprint", async () => {
    (prisma.sprint.create as any).mockResolvedValue({ id: "sp1", name: "Sprint 1", status: "FUTURE" });
    const res = await createSprint({ projectId: "p1", name: "Sprint 1" });
    expect(res.name).toBe("Sprint 1");
    expect(res.status).toBe("FUTURE");
  });

  it("starts sprint changing status to ACTIVE", async () => {
    (prisma.sprint.update as any).mockResolvedValue({ id: "sp1", status: "ACTIVE" });
    const res = await startSprint("sp1");
    expect(res.status).toBe("ACTIVE");
  });

  it("completes sprint changing status to CLOSED", async () => {
    (prisma.sprint.update as any).mockResolvedValue({ id: "sp1", status: "CLOSED" });
    const res = await completeSprint("sp1");
    expect(res.status).toBe("CLOSED");
  });

  it("moves issue to sprint", async () => {
    (prisma.issue.update as any).mockResolvedValue({ id: "i1", sprintId: "sp1" });
    const res = await moveIssueToSprint("i1", "sp1");
    expect(res.sprintId).toBe("sp1");
  });
});
