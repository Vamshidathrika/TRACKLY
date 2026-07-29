/**
 * Team Workload & Member Story Point Capacity Calculation Engine.
 * Benchmark inspired by Linear Cycles & Jira Advanced Capacity Planning.
 */

export interface MemberCapacitySpec {
  userId: string;
  userName: string;
  assignedPoints: number;
  maxCapacityPoints?: number;
}

export interface MemberCapacityResult {
  userId: string;
  userName: string;
  assignedPoints: number;
  maxCapacityPoints: number;
  utilizationPct: number;
  status: "OPTIMAL" | "NEAR_CAPACITY" | "OVERLOADED";
  statusBadgeClass: string;
}

export function calculateMemberCapacity(input: MemberCapacitySpec): MemberCapacityResult {
  const maxCapacity = input.maxCapacityPoints ?? 10;
  const assigned = Math.max(0, input.assignedPoints);
  const utilizationPct = Math.round((assigned / maxCapacity) * 100);

  let status: "OPTIMAL" | "NEAR_CAPACITY" | "OVERLOADED" = "OPTIMAL";
  let statusBadgeClass = "bg-emerald-500/15 text-emerald-600 border-emerald-500/30";

  if (utilizationPct > 100) {
    status = "OVERLOADED";
    statusBadgeClass = "bg-red-500/15 text-red-600 font-bold border-red-500/30 animate-pulse";
  } else if (utilizationPct >= 80) {
    status = "NEAR_CAPACITY";
    statusBadgeClass = "bg-amber-500/15 text-amber-600 font-bold border-amber-500/30";
  }

  return {
    userId: input.userId,
    userName: input.userName,
    assignedPoints: assigned,
    maxCapacityPoints: maxCapacity,
    utilizationPct,
    status,
    statusBadgeClass,
  };
}

export function calculateTeamCapacitySummary(members: MemberCapacitySpec[]) {
  const results = members.map(calculateMemberCapacity);
  const totalAssigned = results.reduce((sum, m) => sum + m.assignedPoints, 0);
  const totalCapacity = results.reduce((sum, m) => sum + m.maxCapacityPoints, 0);
  const overloadedCount = results.filter((m) => m.status === "OVERLOADED").length;

  return {
    members: results,
    totalAssignedPoints: totalAssigned,
    totalMaxCapacityPoints: totalCapacity,
    overallUtilizationPct: totalCapacity > 0 ? Math.round((totalAssigned / totalCapacity) * 100) : 0,
    overloadedMembersCount: overloadedCount,
  };
}
