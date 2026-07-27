import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.setConfig({ testTimeout: 15000 });
import { ReportsView, BurndownData, VelocityData, CumulativeData } from "./ReportsView";

const sampleBurndown: BurndownData = {
  sprintName: "Sprint 1",
  totalPoints: 20,
  pointsDone: 12,
  pointsRemaining: 8,
  timeline: [
    { day: "Day 1", ideal: 20, actual: 20 },
    { day: "Day 2", ideal: 15, actual: 16 },
    { day: "Day 3", ideal: 10, actual: 12 },
    { day: "Day 4", ideal: 5, actual: 8 },
  ],
};

const sampleVelocity: VelocityData = [
  { name: "Sprint 1", committed: 20, completed: 18 },
  { name: "Sprint 2", committed: 25, completed: 22 },
];

const sampleCumulative: CumulativeData = [
  { status: "TODO", count: 4 },
  { status: "IN_PROGRESS", count: 6 },
  { status: "DONE", count: 10 },
];

describe("ReportsView", () => {
  it("renders Burndown Chart by default and switches tabs to Velocity and Cumulative Flow", () => {
    render(
      <ReportsView
        burndown={sampleBurndown}
        velocity={sampleVelocity}
        cumulative={sampleCumulative}
      />
    );

    expect(screen.getByText("Sprint 1 Burndown")).toBeInTheDocument();
    expect(screen.getByText("Ideal remaining story points vs actual progress")).toBeInTheDocument();

    const velocityBtn = screen.getByRole("button", { name: /velocity chart/i });
    fireEvent.click(velocityBtn);
    expect(screen.getByText("Sprint Velocity Chart")).toBeInTheDocument();

    const cumulativeBtn = screen.getByRole("button", { name: /cumulative flow/i });
    fireEvent.click(cumulativeBtn);
    expect(screen.getByText("Cumulative Flow Diagram")).toBeInTheDocument();
    expect(screen.getByText("10 issues")).toBeInTheDocument();
  });
});
