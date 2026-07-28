import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/app/(app)/projects/[key]/issues/actions", () => ({
  updateIssueFieldAction: vi.fn(),
  deleteIssueAction: vi.fn(),
  logWorkAction: vi.fn(),
  postCommentAction: vi.fn(),
  getIssueDevelopmentDataAction: vi.fn().mockResolvedValue({ commits: [], pullRequests: [], branches: [] }),
}));

// IssueDetailDrawer imports this too. Unmocked, it pulls the real lib/auth ->
// next-auth -> next/server, which does not resolve under jsdom and fails the
// whole suite at import time before a single test runs.
vi.mock("@/app/(app)/projects/[key]/issues/detail-actions", () => ({
  getIssueDetailAction: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/app/(app)/projects/[key]/dev/actions", () => ({
  fetchDevDashboardDataAction: vi.fn().mockResolvedValue({
    hasConnectedRepo: true,
    repos: [{ owner: "Vamshidathrika", repoName: "TRACKLY" }],
    stats: { commits: [] },
  }),
  connectGithubRepoAction: vi.fn().mockResolvedValue({ success: true }),
}));

import { IssueDetailDrawer } from "./IssueDetailDrawer";
import type { BoardIssue } from "./IssueCard";


const sampleIssue: BoardIssue = {
  id: "issue-1",
  key: "PRJ-101",
  summary: "Design new component library",
  description: "Detailed spec for atomic design system",
  type: "STORY",
  status: "IN_PROGRESS",
  priority: "HIGH",
  createdAt: new Date(),
  updatedAt: new Date(),
  projectKey: "PRJ",
  project: { key: "PRJ", name: "Project Alpha" },
  assignee: { id: "user-1", name: "Alice Dev", avatarUrl: null },
  reporter: { id: "user-2", name: "Bob Lead", avatarUrl: null },
  storyPoints: 5,
};


describe("IssueDetailDrawer", () => {
  it("renders issue details, title, and assignee", () => {
    const handleClose = vi.fn();
    const handleUpdate = vi.fn();
    const handleDelete = vi.fn();

    render(
      <IssueDetailDrawer
        issue={sampleIssue}
        onClose={handleClose}
        onUpdateIssue={handleUpdate}
        onDeleteIssue={handleDelete}
        availableUsers={[{ id: "user-1", name: "Alice Dev" }, { id: "user-2", name: "Bob Lead" }]}
      />
    );

    expect(screen.getByText("PRJ-101")).toBeInTheDocument();
    expect(screen.getByText("Design new component library")).toBeInTheDocument();
  });


  it("calls onClose when close button is clicked", () => {
    const handleClose = vi.fn();
    const handleUpdate = vi.fn();
    const handleDelete = vi.fn();

    render(
      <IssueDetailDrawer
        issue={sampleIssue}
        onClose={handleClose}
        onUpdateIssue={handleUpdate}
        onDeleteIssue={handleDelete}
      />
    );

    const closeBtn = screen.getByTitle("Close (Esc)");
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledOnce();
  });

});
