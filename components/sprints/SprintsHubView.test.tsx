import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SprintsHubView } from "./SprintsHubView";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/app/(app)/projects/[key]/backlog/actions", () => ({
  createSprintAction: vi.fn(),
  startSprintAction: vi.fn(),
  completeSprintAction: vi.fn(),
}));

const mockSprints = [
  {
    id: "sp-active",
    name: "Sprint 1 (Active)",
    goal: "Launch MVP",
    status: "ACTIVE" as const,
    startDate: new Date("2026-07-01"),
    endDate: new Date("2026-07-15"),
    createdAt: new Date("2026-06-25"),
    issues: [
      { id: "i1", key: "PRJ-1", summary: "Task 1", status: "DONE", storyPoints: 5 },
      { id: "i2", key: "PRJ-2", summary: "Task 2", status: "IN_PROGRESS", storyPoints: 3 },
    ],
  },
  {
    id: "sp-closed",
    name: "Sprint 0 (Closed)",
    goal: "Setup Infrastructure",
    status: "CLOSED" as const,
    startDate: new Date("2026-06-15"),
    endDate: new Date("2026-06-30"),
    createdAt: new Date("2026-06-10"),
    issues: [
      { id: "i3", key: "PRJ-3", summary: "Task 3", status: "DONE", storyPoints: 8 },
    ],
  },
];

describe("SprintsHubView Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders sprint directory with header and summary statistics", () => {
    render(
      <SprintsHubView
        projectId="p1"
        projectKey="PRJ"
        projectName="Test Project"
        initialSprints={mockSprints}
      />
    );

    expect(screen.getByText("Test Project Sprints")).toBeInTheDocument();
    expect(screen.getAllByText("Sprint 1 (Active)").length).toBeGreaterThan(0);
    expect(screen.getByText("Sprint 0 (Closed)")).toBeInTheDocument();
    expect(screen.getByText("13 pts")).toBeInTheDocument(); // 5 + 8 completed pts
  });

  it("filters sprint list when switching tab to ACTIVE or CLOSED", () => {
    render(
      <SprintsHubView
        projectId="p1"
        projectKey="PRJ"
        projectName="Test Project"
        initialSprints={mockSprints}
      />
    );

    // Switch to Closed filter tab
    const closedTab = screen.getByText("Closed Archive");
    fireEvent.click(closedTab);

    expect(screen.getByText("Sprint 0 (Closed)")).toBeInTheDocument();
    // Sprint 0 should be listed in the grid
    expect(screen.getByRole("heading", { name: "Sprint 0 (Closed)" })).toBeInTheDocument();
  });

  it("filters sprint list by search query", () => {
    render(
      <SprintsHubView
        projectId="p1"
        projectKey="PRJ"
        projectName="Test Project"
        initialSprints={mockSprints}
      />
    );

    const searchInput = screen.getByPlaceholderText(/filter sprints/i);
    fireEvent.change(searchInput, { target: { value: "Infrastructure" } });

    expect(screen.getByText("Sprint 0 (Closed)")).toBeInTheDocument();
  });
});
