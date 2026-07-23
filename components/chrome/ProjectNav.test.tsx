import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("@/app/(app)/chrome-actions", () => ({
  toggleStarAction: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/projects/TRK/board",
}));

import { ProjectNav } from "./ProjectNav";

it("renders project header, items, active board, disabled timeline", () => {
  render(
    <ProjectNav
      projectKey="TRK"
      projectName="Trackly Core"
      projectId="p1"
      initiallyStarred={false}
    />
  );
  expect(screen.getByText("Trackly Core")).toBeInTheDocument();
  expect(screen.getByText("Board").closest("a")).toHaveClass("bg-selected");
  expect(screen.getByText("Timeline")).toHaveClass("cursor-not-allowed");
  expect(screen.getByRole("button", { name: "Star project" })).toBeInTheDocument();
});
