import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DashboardCard } from "./DashboardCard";
import { Activity } from "lucide-react";

describe("DashboardCard", () => {
  it("renders title, icon, and children correctly", () => {
    render(
      <DashboardCard title="Telemetry Card" icon={Activity}>
        <div data-testid="card-child">Child Content</div>
      </DashboardCard>
    );

    expect(screen.getByText("Telemetry Card")).toBeDefined();
    expect(screen.getByTestId("card-child")).toBeDefined();
  });

  it("renders empty state when isEmpty is true", () => {
    const handleAction = vi.fn();
    render(
      <DashboardCard
        title="Empty Card"
        icon={Activity}
        isEmpty={true}
        emptyState={{
          title: "No Data Available",
          description: "There are currently no items to display.",
          actionText: "Learn More",
          onAction: handleAction,
        }}
      >
        <div>Should not render</div>
      </DashboardCard>
    );

    expect(screen.getByText("No Data Available")).toBeDefined();
    expect(screen.getByText("There are currently no items to display.")).toBeDefined();

    const actionBtn = screen.getByText("Learn More");
    fireEvent.click(actionBtn);
    expect(handleAction).toHaveBeenCalledTimes(1);
  });
});
