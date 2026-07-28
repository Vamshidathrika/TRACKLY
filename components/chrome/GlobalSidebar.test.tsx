import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { GlobalSidebar } from "./GlobalSidebar";

vi.mock("next/navigation", () => ({ usePathname: () => "/dashboards" }));

const projects = [{ id: "p1", key: "TRK", name: "Trackly Core" }];

it("renders sections and marks active route", () => {
  render(<GlobalSidebar projects={projects} starredProjectIds={[]} collapsed={false} />);
  for (const label of ["My Work", "Projects", "Filters", "Dashboards", "Plans & Roadmap"]) {
    expect(screen.getByText(label)).toBeInTheDocument();
  }
  expect(screen.getByText("Trackly Core")).toBeInTheDocument();
  expect(screen.getByText("Dashboards").closest("a")).toHaveClass("bg-brand/10");
});

it("tells a user with no boards how to get one, instead of a bare heading", () => {
  // A fresh signup, or anyone whose only membership is an auto-provisioned
  // personal workspace, gets projects=[]. The section used to render its
  // "Projects" title with no items and no explanation, which reads as the
  // sidebar being broken rather than empty.
  render(<GlobalSidebar projects={[]} starredProjectIds={[]} collapsed={false} />);

  expect(screen.getByText("Projects")).toBeInTheDocument();
  expect(screen.getByText(/no boards yet/i)).toBeInTheDocument();

  const create = screen.getByRole("link", { name: /create a board/i });
  expect(create).toHaveAttribute("href", "/projects");
});

it("does not show the empty state once boards exist", () => {
  render(<GlobalSidebar projects={projects} starredProjectIds={[]} collapsed={false} />);
  expect(screen.queryByText(/no boards yet/i)).not.toBeInTheDocument();
});

it("renders icon-only mode when collapsed", () => {
  const { container } = render(<GlobalSidebar projects={projects} starredProjectIds={[]} collapsed />);
  const nav = container.querySelector("nav");
  expect(nav).toBeInTheDocument();
  expect(nav).toHaveClass("w-[52px]");
});
