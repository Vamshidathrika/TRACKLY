import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { CommandPalette } from "./CommandPalette";

// Mock next/navigation router
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock quickSearchAction server action
vi.mock("@/app/(app)/search/actions", () => ({
  quickSearchAction: vi.fn().mockResolvedValue({ issues: [], projects: [] }),
}));

const projects = [{ id: "p1", key: "TRK", name: "Trackly Core" }];

it("renders input when open and lists actions", async () => {
  const onOpenChange = vi.fn();
  const onCreateIssue = vi.fn();
  const onSetTheme = vi.fn();

  render(
    <CommandPalette
      open
      onOpenChange={onOpenChange}
      projects={projects}
      onCreateIssue={onCreateIssue}
      onSetTheme={onSetTheme}
    />
  );

  expect(screen.getByPlaceholderText(/Search or jump/i)).toBeInTheDocument();
  expect(screen.getByText("Create issue")).toBeInTheDocument();
  expect(screen.getByText("Toggle theme (Light/Dark)")).toBeInTheDocument();
});
