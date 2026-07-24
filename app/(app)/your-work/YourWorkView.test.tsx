import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/your-work",
}));

vi.mock("@/lib/auth", () => ({
  getAuthUser: vi.fn().mockResolvedValue({ id: "user-1", name: "Test User", email: "test@example.com" }),
}));

vi.mock("@/app/(app)/issues/actions", () => ({
  createIssueAction: vi.fn(),
  fetchUserProjectsAction: vi.fn().mockResolvedValue([
    { id: "proj-1", name: "Alpha", key: "ALP" },
  ]),
  fetchWorkspaceMembersAction: vi.fn().mockResolvedValue([
    { id: "user-1", name: "Alice", email: "alice@test.com" },
  ]),
}));

vi.mock("@/app/(app)/projects/actions", () => ({
  createProjectAction: vi.fn(),
}));

import { YourWorkView, type UserWorkIssue, type UserWorkProject } from "./YourWorkView";

describe("YourWorkView", () => {
  const mockAssigned: UserWorkIssue[] = [
    {
      id: "issue-1",
      key: "PRJ-1",
      summary: "First test task",
      type: "TASK",
      status: "IN_PROGRESS",
      priority: "HIGH",
      updatedAt: new Date(),
      project: { key: "PRJ", name: "Test Project" },
      assignee: { id: "user-1", name: "Alice" },
    },
  ];

  const mockReported: UserWorkIssue[] = [
    {
      id: "issue-2",
      key: "PRJ-2",
      summary: "Reported task",
      type: "BUG",
      status: "TO_DO",
      priority: "MEDIUM",
      updatedAt: new Date(),
      project: { key: "PRJ", name: "Test Project" },
      assignee: null,
    },
  ];

  const mockProjects: UserWorkProject[] = [
    {
      id: "proj-1",
      key: "PRJ",
      name: "Test Project",
      _count: { issues: 2 },
    },
  ];

  it("renders user welcome heading and assigned issues tab by default", () => {
    render(
      <YourWorkView
        assignedIssues={mockAssigned}
        reportedIssues={mockReported}
        userProjects={mockProjects}
        userName="Test User"
      />
    );

    expect(screen.getByText(/Your Work/i)).toBeInTheDocument();
    expect(screen.getByText(/Welcome back, Test User/i)).toBeInTheDocument();
    expect(screen.getByText("First test task")).toBeInTheDocument();
  });

  it("switches tabs to Worked / Reported by me and Workspace Spaces", () => {
    render(
      <YourWorkView
        assignedIssues={mockAssigned}
        reportedIssues={mockReported}
        userProjects={mockProjects}
        userName="Test User"
      />
    );

    const reportedTab = screen.getByRole("button", { name: /Worked \/ Reported by me/i });
    fireEvent.click(reportedTab);
    expect(screen.getByText("Reported task")).toBeInTheDocument();

    const projectsTab = screen.getByRole("button", { name: /Workspace Spaces/i });
    fireEvent.click(projectsTab);
    expect(screen.getByText("Test Project")).toBeInTheDocument();
  });
});
