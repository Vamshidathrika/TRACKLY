import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./prisma", () => ({
  prisma: {
    sprint: { findUnique: vi.fn(), findMany: vi.fn() },
    issue: { findMany: vi.fn() },
  },
}));
import { prisma } from "./prisma";
import { getBurndownData, getVelocityData, getProjectMetrics, formatReportCSV, getLeadCycleTimeMetrics, formatHoursDuration } from "./reports";


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

  it("formats report data into valid CSV string", () => {
    const csv = formatReportCSV("velocity", [
      { name: "Sprint 1", committed: 10, completed: 8 },
    ]);
    expect(csv).toContain("Sprint Name,Committed Points,Completed Points");
    expect(csv).toContain('"Sprint 1",10,8');
  });
  it("calculates lead time and cycle time metrics for completed issues", async () => {
    const now = new Date();
    const createdAt = new Date(now.getTime() - 48 * 3_600_000); // 48h ago
    const firstWorklogAt = new Date(now.getTime() - 24 * 3_600_000); // 24h ago

    (prisma.issue.findMany as any).mockResolvedValue([
      {
        id: "i1",
        key: "TRK-100",
        summary: "Fix login page",
        priority: "HIGH",
        createdAt,
        updatedAt: now,
        dueDate: null,
        workLogs: [{ createdAt: firstWorklogAt }],
      },
    ]);

    const summary = await getLeadCycleTimeMetrics("p1");
    expect(summary.totalSampled).toBe(1);
    expect(summary.metrics[0].leadTimeHours).toBeGreaterThanOrEqual(48);
    expect(summary.metrics[0].cycleTimeHours).toBeGreaterThanOrEqual(24);
    expect(summary.avgLeadTimeHours).toBeGreaterThan(0);
    expect(summary.avgCycleTimeHours).toBeGreaterThan(0);
  });

  it("returns zero averages when no completed issues exist", async () => {
    (prisma.issue.findMany as any).mockResolvedValue([]);
    const summary = await getLeadCycleTimeMetrics("p1");
    expect(summary.totalSampled).toBe(0);
    expect(summary.avgLeadTimeHours).toBe(0);
    expect(summary.avgCycleTimeHours).toBe(0);
  });

  it("formats hour durations into human-readable strings", () => {
    expect(formatHoursDuration(null)).toBe("—");
    expect(formatHoursDuration(0)).toBe("0h");
    expect(formatHoursDuration(0.5)).toBe("30min");
    expect(formatHoursDuration(6)).toBe("6h");
    expect(formatHoursDuration(24)).toBe("1d");
    expect(formatHoursDuration(48)).toBe("2d");
    expect(formatHoursDuration(27)).toBe("1d 3h");
  });
});
