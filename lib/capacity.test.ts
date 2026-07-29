import { describe, test, expect } from "vitest";
import { calculateMemberCapacity, calculateTeamCapacitySummary } from "./capacity";

describe("Team Workload & Capacity Planning Engine", () => {
  test("calculates OPTIMAL capacity when story points are under limit", () => {
    const res = calculateMemberCapacity({ userId: "u1", userName: "Alex", assignedPoints: 6, maxCapacityPoints: 10 });
    expect(res.status).toBe("OPTIMAL");
    expect(res.utilizationPct).toBe(60);
  });

  test("detects NEAR_CAPACITY when story points hit 80% limit", () => {
    const res = calculateMemberCapacity({ userId: "u2", userName: "Sam", assignedPoints: 8, maxCapacityPoints: 10 });
    expect(res.status).toBe("NEAR_CAPACITY");
    expect(res.utilizationPct).toBe(80);
  });

  test("detects OVERLOADED capacity when story points exceed limit", () => {
    const res = calculateMemberCapacity({ userId: "u3", userName: "Jordan", assignedPoints: 14, maxCapacityPoints: 10 });
    expect(res.status).toBe("OVERLOADED");
    expect(res.utilizationPct).toBe(140);
  });

  test("calculates team capacity summary correctly", () => {
    const summary = calculateTeamCapacitySummary([
      { userId: "u1", userName: "Alex", assignedPoints: 5, maxCapacityPoints: 10 },
      { userId: "u2", userName: "Sam", assignedPoints: 12, maxCapacityPoints: 10 },
    ]);
    expect(summary.totalAssignedPoints).toBe(17);
    expect(summary.totalMaxCapacityPoints).toBe(20);
    expect(summary.overallUtilizationPct).toBe(85);
    expect(summary.overloadedMembersCount).toBe(1);
  });
});
