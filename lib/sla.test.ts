import { describe, test, expect } from "vitest";
import { calculateIssueSLA } from "./sla";

describe("SLA & Incident Breach Engine", () => {
  test("calculates SLA Met when issue status is DONE", () => {
    const sla = calculateIssueSLA("HIGHEST", new Date(), "DONE");
    expect(sla.isBreached).toBe(false);
    expect(sla.badgeLabel).toBe("SLA Met");
  });

  test("detects breached SLA for old HIGHEST priority task", () => {
    const fiveHoursAgo = new Date(Date.now() - 5 * 3600 * 1000);
    const sla = calculateIssueSLA("HIGHEST", fiveHoursAgo, "TO_DO");
    expect(sla.isBreached).toBe(true);
    expect(sla.breachType).toBe("RESOLUTION_BREACHED");
    expect(sla.badgeLabel).toContain("SLA Breached");
  });

  test("calculates active SLA hours remaining for recent issue", () => {
    const sla = calculateIssueSLA("MEDIUM", new Date(), "IN_PROGRESS");
    expect(sla.isBreached).toBe(false);
    expect(sla.badgeLabel).toContain("SLA:");
  });
});
