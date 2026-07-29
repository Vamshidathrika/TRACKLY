/**
 * Service Level Agreement (SLA) & Incident Breach Calculation Engine.
 * Calculates First Response & Resolution SLAs based on issue priority.
 */

export interface SLARule {
  priority: "HIGHEST" | "HIGH" | "MEDIUM" | "LOW" | "LOWEST";
  firstResponseHours: number;
  resolutionHours: number;
}

export const DEFAULT_SLA_RULES: Record<string, SLARule> = {
  HIGHEST: { priority: "HIGHEST", firstResponseHours: 1, resolutionHours: 4 },
  HIGH: { priority: "HIGH", firstResponseHours: 4, resolutionHours: 24 },
  MEDIUM: { priority: "MEDIUM", firstResponseHours: 12, resolutionHours: 48 },
  LOW: { priority: "LOW", firstResponseHours: 24, resolutionHours: 120 },
  LOWEST: { priority: "LOWEST", firstResponseHours: 48, resolutionHours: 240 },
};

export interface SLABreachInfo {
  isBreached: boolean;
  breachType: "NONE" | "RESPONSE_BREACHED" | "RESOLUTION_BREACHED";
  hoursRemaining: number;
  badgeLabel: string;
  badgeClass: string;
}

export function calculateIssueSLA(
  priority: string,
  createdAt: Date | string,
  status: string
): SLABreachInfo {
  const rule = DEFAULT_SLA_RULES[priority.toUpperCase()] || DEFAULT_SLA_RULES.MEDIUM;
  const created = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  const now = new Date();

  if (isNaN(created.getTime())) {
    return { isBreached: false, breachType: "NONE", hoursRemaining: 99, badgeLabel: "SLA Active", badgeClass: "bg-neutral text-text-subtle" };
  }

  const elapsedHours = (now.getTime() - created.getTime()) / (1000 * 3600);
  const targetHours = rule.resolutionHours;
  const remaining = Math.round((targetHours - elapsedHours) * 10) / 10;

  if (status === "DONE") {
    return {
      isBreached: false,
      breachType: "NONE",
      hoursRemaining: 0,
      badgeLabel: "SLA Met",
      badgeClass: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
    };
  }

  if (remaining < 0) {
    return {
      isBreached: true,
      breachType: "RESOLUTION_BREACHED",
      hoursRemaining: remaining,
      badgeLabel: `SLA Breached (${Math.abs(remaining)}h over)`,
      badgeClass: "bg-red-500/15 text-red-600 font-bold border-red-500/30 animate-pulse",
    };
  }

  if (remaining <= 2) {
    return {
      isBreached: false,
      breachType: "NONE",
      hoursRemaining: remaining,
      badgeLabel: `SLA Warning (${remaining}h left)`,
      badgeClass: "bg-amber-500/15 text-amber-600 font-bold border-amber-500/30",
    };
  }

  return {
    isBreached: false,
    breachType: "NONE",
    hoursRemaining: remaining,
    badgeLabel: `SLA: ${remaining}h left`,
    badgeClass: "bg-neutral text-text-subtle border-border",
  };
}
