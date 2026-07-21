import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./prisma", () => ({
  prisma: {
    sprint: { findUnique: vi.fn(), findMany: vi.fn() },
    issue: { findMany: vi.fn() },
  },
}));
import { prisma } from "./prisma";
import { getBurndownData, getVelocityData, getProjectMetrics } from "./reports";

describe("reports data layer", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calculates burndown data curve", async () => {
    (prisma.sprint.findUnique as any).mockResolvedValue({
      id: "sp1",
      name: "Sprint 1",
      startDate: new Date("2026-07-01"),
      endDate: new Date("2026-07-14"),
      issues: [
        { id: "i1", storyPoints: 5, status: "DONE" },
        { id: "i2", storyPoints: 3, status: "TO_DO" },
      ],
    });

    const data = await getBurndownData("sp1");
    expect(data.sprintName).toBe("Sprint 1");
    expect(data.totalPoints).toBe(8);
    expect(data.pointsDone).toBe(5);
    expect(data.pointsRemaining).toBe(3);
  });

  it("calculates velocity data across sprints", async () => {
    (prisma.sprint.findMany as any).mockResolvedValue([
      {
        id: "sp1",
        name: "Sprint 1",
        issues: [
          { storyPoints: 5, status: "DONE" },
          { storyPoints: 5, status: "TO_DO" },
        ],
      },
      {
        id: "sp2",
        name: "Sprint 2",
        issues: [
          { storyPoints: 8, status: "DONE" },
        ],
      },
    ]);

    const velocity = await getVelocityData("p1");
    expect(velocity.length).toBe(2);
    expect(velocity[0].committed).toBe(10);
    expect(velocity[0].completed).toBe(5);
    expect(velocity[1].committed).toBe(8);
    expect(velocity[1].completed).toBe(8);
  });

  it("calculates project status & priority breakdown metrics", async () => {
    (prisma.issue.findMany as any).mockResolvedValue([
      { status: "TO_DO", priority: "HIGH" },
      { status: "IN_PROGRESS", priority: "HIGH" },
      { status: "DONE", priority: "MEDIUM" },
    ]);

    const metrics = await getProjectMetrics("p1");
    expect(metrics.statusCounts["TO_DO"]).toBe(1);
    expect(metrics.statusCounts["IN_PROGRESS"]).toBe(1);
    expect(metrics.statusCounts["DONE"]).toBe(1);
    expect(metrics.priorityCounts["HIGH"]).toBe(2);
  });
});
