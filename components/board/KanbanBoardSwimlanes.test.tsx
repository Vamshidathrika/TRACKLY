import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect } from "vitest";

// Mock lib/auth to prevent next-auth/next/server import issues in JSDOM
vi.mock("@/lib/auth", () => ({
  getAuthUser: vi.fn().mockResolvedValue({ id: "user-1", name: "Test User", email: "test@example.com" }),
}));

// Mock next/navigation router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock server actions
vi.mock("@/app/(app)/projects/[key]/issues/actions", () => ({
  updateIssueFieldAction: vi.fn().mockResolvedValue({ success: true }),
  logWorkAction: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/app/(app)/chrome-actions", () => ({
  toggleStarAction: vi.fn().mockResolvedValue({ starred: true }),
}));

vi.mock("@/app/(app)/projects/[key]/backlog/actions", () => ({
  quickCreateIssueAction: vi.fn().mockResolvedValue({ success: true }),
}));

import { KanbanBoard } from "./KanbanBoard";
import type { BoardIssue } from "./IssueCard";

const mockUsers = [
  { id: "user-1", name: "Alice Smith", avatarUrl: null },
  { id: "user-2", name: "Bob Jones", avatarUrl: null },
];

const mockIssues: BoardIssue[] = [
  {
    id: "issue-1",
    key: "PROJ-1",
    summary: "Fix Login Bug",
    type: "BUG",
    status: "TO_DO",
    priority: "HIGHEST",
    storyPoints: 3,
    assignee: mockUsers[0],
    projectKey: "PROJ",
  },
  {
    id: "issue-2",
    key: "PROJ-2",
    summary: "Implement Auth Flow",
    type: "STORY",
    status: "IN_PROGRESS",
    priority: "HIGH",
    storyPoints: 5,
    assignee: mockUsers[0],
    projectKey: "PROJ",
  },
  {
    id: "issue-3",
    key: "PROJ-3",
    summary: "Design System Tokens",
    type: "TASK",
    status: "IN_PROGRESS",
    priority: "MEDIUM",
    storyPoints: 2,
    assignee: mockUsers[1],
    projectKey: "PROJ",
  },
  {
    id: "issue-4",
    key: "PROJ-4",
    summary: "Refactor Database Queries",
    type: "TASK",
    status: "IN_REVIEW",
    priority: "LOW",
    storyPoints: 1,
    assignee: null,
    projectKey: "PROJ",
  },
];

describe("KanbanBoard Swimlanes & WIP Limit Warnings", () => {
  it("renders default board without swimlanes when Group by is 'None'", () => {
    render(
      <KanbanBoard
        issues={mockIssues}
        availableUsers={mockUsers}
        projectName="Test Project"
        projectKey="PROJ"
      />
    );

    // Verify 4 main column headers are present
    expect(screen.getByRole("heading", { name: "TO DO" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "IN PROGRESS" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "IN REVIEW" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "DONE" })).toBeInTheDocument();

    // Verify issues are visible in single board view
    expect(screen.getByText("Fix Login Bug")).toBeInTheDocument();
    expect(screen.getByText("Implement Auth Flow")).toBeInTheDocument();
    expect(screen.getByText("Design System Tokens")).toBeInTheDocument();
    expect(screen.getByText("Refactor Database Queries")).toBeInTheDocument();
  });

  describe("Assignee Swimlanes", () => {
    it("groups issues into swimlanes by Assignee", async () => {
      render(
        <KanbanBoard
          issues={mockIssues}
          availableUsers={mockUsers}
          projectName="Test Project"
          projectKey="PROJ"
        />
      );

      const groupSelect = screen.getByRole("combobox", { name: /group by/i });
      await userEvent.selectOptions(groupSelect, "Assignee");

      // Verify swimlane headers appear for users and unassigned
      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
      expect(screen.getByText("Bob Jones")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Unassigned.*1 issues/i })).toBeInTheDocument();

      // Check swimlane stats (issues & story points)
      expect(screen.getByText("2 issues • 8 pts")).toBeInTheDocument(); // Alice: PROJ-1 (3) + PROJ-2 (5)
      expect(screen.getByText("1 issues • 2 pts")).toBeInTheDocument(); // Bob: PROJ-3 (2)
      expect(screen.getByText("1 issues • 1 pts")).toBeInTheDocument(); // Unassigned: PROJ-4 (1)
    });

    it("collapses and expands swimlane when clicked", async () => {
      render(
        <KanbanBoard
          issues={mockIssues}
          availableUsers={mockUsers}
          projectName="Test Project"
          projectKey="PROJ"
        />
      );

      const groupSelect = screen.getByRole("combobox", { name: /group by/i });
      await userEvent.selectOptions(groupSelect, "Assignee");

      const aliceHeader = screen.getByRole("button", { name: /Alice Smith/i });

      // Initially expanded (indicator shows ▼)
      expect(aliceHeader).toHaveTextContent("▼");
      expect(screen.getByText("Fix Login Bug")).toBeInTheDocument();

      // Click to collapse
      await userEvent.click(aliceHeader);

      // Now collapsed (indicator shows ▶)
      expect(aliceHeader).toHaveTextContent("▶");
      expect(screen.queryByText("Fix Login Bug")).not.toBeInTheDocument();

      // Click to expand again
      await userEvent.click(aliceHeader);
      expect(aliceHeader).toHaveTextContent("▼");
      expect(screen.getByText("Fix Login Bug")).toBeInTheDocument();
    });
  });

  describe("Priority Swimlanes", () => {
    it("groups issues into swimlanes by Priority", async () => {
      render(
        <KanbanBoard
          issues={mockIssues}
          availableUsers={mockUsers}
          projectName="Test Project"
          projectKey="PROJ"
        />
      );

      const groupSelect = screen.getByRole("combobox", { name: /group by/i });
      await userEvent.selectOptions(groupSelect, "Priority");

      // Verify priority swimlanes exist for active priorities
      expect(screen.getByText("HIGHEST Priority")).toBeInTheDocument();
      expect(screen.getByText("HIGH Priority")).toBeInTheDocument();
      expect(screen.getByText("MEDIUM Priority")).toBeInTheDocument();
      expect(screen.getByText("LOW Priority")).toBeInTheDocument();

      // Verify stats inside priority headers
      expect(screen.getByText("1 issues • 3 pts")).toBeInTheDocument(); // HIGHEST
      expect(screen.getByText("1 issues • 5 pts")).toBeInTheDocument(); // HIGH
      expect(screen.getByText("1 issues • 2 pts")).toBeInTheDocument(); // MEDIUM
      expect(screen.getByText("1 issues • 1 pts")).toBeInTheDocument(); // LOW
    });
  });

  describe("WIP Limit Warning Indicators", () => {
    it("does not show WIP warning when issue count is below or equal to WIP limit", () => {
      render(
        <KanbanBoard
          issues={mockIssues}
          availableUsers={mockUsers}
          projectName="Test Project"
          projectKey="PROJ"
        />
      );

      // IN_PROGRESS has 2 issues (limit is 4), IN_REVIEW has 1 issue (limit is 3)
      expect(screen.queryByText("Max 4")).not.toBeInTheDocument();
      expect(screen.queryByText("Max 3")).not.toBeInTheDocument();
    });

    it("displays Max 4 WIP limit warning badge when IN_PROGRESS exceeds limit of 4", () => {
      const exceededIssues: BoardIssue[] = [
        ...mockIssues,
        {
          id: "issue-5",
          key: "PROJ-5",
          summary: "Fifth progress issue",
          type: "TASK",
          status: "IN_PROGRESS",
          priority: "MEDIUM",
          storyPoints: 1,
          projectKey: "PROJ",
        },
        {
          id: "issue-6",
          key: "PROJ-6",
          summary: "Sixth progress issue",
          type: "TASK",
          status: "IN_PROGRESS",
          priority: "MEDIUM",
          storyPoints: 1,
          projectKey: "PROJ",
        },
        {
          id: "issue-7",
          key: "PROJ-7",
          summary: "Seventh progress issue",
          type: "TASK",
          status: "IN_PROGRESS",
          priority: "MEDIUM",
          storyPoints: 1,
          projectKey: "PROJ",
        },
      ];

      render(
        <KanbanBoard
          issues={exceededIssues}
          availableUsers={mockUsers}
          projectName="Test Project"
          projectKey="PROJ"
        />
      );

      // Total IN_PROGRESS issues = 5 (exceeds WIP limit of 4)
      const warningBadge = screen.getByText("Max 4");
      expect(warningBadge).toBeInTheDocument();
      expect(warningBadge).toHaveClass("bg-danger");
    });

    it("displays Max 3 WIP limit warning badge when IN_REVIEW exceeds limit of 3", () => {
      const exceededReviewIssues: BoardIssue[] = [
        ...mockIssues,
        {
          id: "issue-5",
          key: "PROJ-5",
          summary: "Review issue 2",
          type: "TASK",
          status: "IN_REVIEW",
          priority: "MEDIUM",
          storyPoints: 1,
          projectKey: "PROJ",
        },
        {
          id: "issue-6",
          key: "PROJ-6",
          summary: "Review issue 3",
          type: "TASK",
          status: "IN_REVIEW",
          priority: "MEDIUM",
          storyPoints: 1,
          projectKey: "PROJ",
        },
        {
          id: "issue-7",
          key: "PROJ-7",
          summary: "Review issue 4",
          type: "TASK",
          status: "IN_REVIEW",
          priority: "MEDIUM",
          storyPoints: 1,
          projectKey: "PROJ",
        },
      ];

      render(
        <KanbanBoard
          issues={exceededReviewIssues}
          availableUsers={mockUsers}
          projectName="Test Project"
          projectKey="PROJ"
        />
      );

      // Total IN_REVIEW issues = 4 (exceeds WIP limit of 3)
      const warningBadge = screen.getByText("Max 3");
      expect(warningBadge).toBeInTheDocument();
      expect(warningBadge).toHaveClass("bg-danger");
    });
  });
});
