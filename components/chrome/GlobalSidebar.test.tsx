import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { GlobalSidebar } from "./GlobalSidebar";

vi.mock("next/navigation", () => ({ usePathname: () => "/dashboards" }));

const projects = [{ id: "p1", key: "TRK", name: "Trackly Core" }];

it("renders sections and marks active route", () => {
  render(<GlobalSidebar projects={projects} starredProjectIds={[]} collapsed={false} />);
  for (const label of ["Your work", "Projects", "Filters", "Dashboards", "Plans"]) {
    expect(screen.getByText(label)).toBeInTheDocument();
  }
  expect(screen.getByText("Trackly Core")).toBeInTheDocument();
  expect(screen.getByText("Dashboards").closest("a")).toHaveClass("bg-selected");
});

it("renders nothing when collapsed", () => {
  const { container } = render(<GlobalSidebar projects={projects} starredProjectIds={[]} collapsed />);
  expect(container.querySelector("nav")).toBeNull();
});
