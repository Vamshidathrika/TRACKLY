import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./prisma", () => {
  const sprint = {
    create: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    findUnique: vi.fn(),
  };
  const issue = { update: vi.fn(), updateMany: vi.fn() };
  return {
    prisma: {
      sprint,
      issue,
      // completeSprint runs both writes in one transaction; hand the callback a
      // tx that proxies to the same mocks so assertions still see the calls.
      $transaction: vi.fn(async (fn: any) => fn({ sprint, issue })),
    },
  };
});
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
    (prisma.sprint.findUnique as any).mockResolvedValue({ id: "sp1", projectId: "p1", startDate: null, endDate: null });
    (prisma.sprint.findFirst as any).mockResolvedValue(null);
    (prisma.sprint.update as any).mockResolvedValue({ id: "sp1", status: "ACTIVE" });
    const res = await startSprint("sp1");
    expect(res.status).toBe("ACTIVE");
  });

  it("preserves the dates chosen at sprint creation instead of overwriting them", async () => {
    const planredStart = new Date("2026-03-01T00:00:00Z");
    const plannedEnd = new Date("2026-03-15T00:00:00Z");
    (prisma.sprint.findUnique as any).mockResolvedValue({
      id: "sp1",
      projectId: "p1",
      startDate: planredStart,
      endDate: plannedEnd,
    });
    (prisma.sprint.findFirst as any).mockResolvedValue(null);
    (prisma.sprint.update as any).mockResolvedValue({ id: "sp1", status: "ACTIVE" });

    await startSprint("sp1");

    const data = (prisma.sprint.update as any).mock.calls[0][0].data;
    expect(data.startDate).toBe(planredStart);
    expect(data.endDate).toBe(plannedEnd);
  });

  it("refuses to start a second sprint while one is already ACTIVE on the project", async () => {
    (prisma.sprint.findUnique as any).mockResolvedValue({ id: "sp2", projectId: "p1", startDate: null, endDate: null });
    (prisma.sprint.findFirst as any).mockResolvedValue({ id: "sp1", name: "Sprint 1", status: "ACTIVE" });

    await expect(startSprint("sp2")).rejects.toThrow(/already active/i);
    expect(prisma.sprint.update).not.toHaveBeenCalled();
  });

  it("throws when the sprint does not exist", async () => {
    (prisma.sprint.findUnique as any).mockResolvedValue(null);
    await expect(startSprint("missing")).rejects.toThrow("Sprint not found");
  });

  it("completes sprint changing status to CLOSED", async () => {
    (prisma.sprint.update as any).mockResolvedValue({ id: "sp1", status: "CLOSED" });
    const res = await completeSprint("sp1");
    expect(res.status).toBe("CLOSED");
  });

  it("returns un-DONE issues to the backlog inside the same transaction", async () => {
    (prisma.sprint.update as any).mockResolvedValue({ id: "sp1", status: "CLOSED" });

    await completeSprint("sp1");

    expect((prisma as any).$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.issue.updateMany).toHaveBeenCalledWith({
      where: { sprintId: "sp1", status: { not: "DONE" } },
      data: { sprintId: null },
    });
  });

  it("moves issue to sprint", async () => {
    (prisma.issue.update as any).mockResolvedValue({ id: "i1", sprintId: "sp1" });
    const res = await moveIssueToSprint("i1", "sp1");
    expect(res.sprintId).toBe("sp1");
  });
});
