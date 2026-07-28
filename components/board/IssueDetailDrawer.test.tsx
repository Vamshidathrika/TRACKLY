import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

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

vi.mock("@/app/(app)/projects/[key]/releases/actions", () => ({
  getReleasesAction: vi.fn().mockResolvedValue({ success: true, releases: [] }),
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
import { updateIssueFieldAction, postCommentAction } from "@/app/(app)/projects/[key]/issues/actions";

/**
 * Creates a promise the test controls the settlement of, plus the function
 * that settles it. Used to assert the optimistic UI is visible WHILE the
 * mocked server action is still in flight, not just "eventually" after
 * everything resolves.
 */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}


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
  beforeEach(() => {
    vi.mocked(updateIssueFieldAction).mockReset();
    vi.mocked(postCommentAction).mockReset();
  });

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

  it("shows a status change immediately, while the server call is still in flight", async () => {
    const { promise, resolve } = deferred<{ success: true }>();
    vi.mocked(updateIssueFieldAction).mockReturnValueOnce(promise as any);

    render(
      <IssueDetailDrawer
        issue={sampleIssue}
        onClose={vi.fn()}
        onUpdateIssue={vi.fn()}
        onDeleteIssue={vi.fn()}
        availableUsers={[{ id: "user-1", name: "Alice Dev" }, { id: "user-2", name: "Bob Lead" }]}
      />
    );

    const statusSelect = screen.getByDisplayValue("IN PROGRESS") as HTMLSelectElement;
    fireEvent.change(statusSelect, { target: { value: "IN_REVIEW" } });

    // The mocked action has not resolved yet, so this can only pass if the
    // optimistic patch painted the new value ahead of the server response.
    await waitFor(() => expect(statusSelect.value).toBe("IN_REVIEW"));

    resolve({ success: true });
    await waitFor(() => expect(updateIssueFieldAction).toHaveBeenCalledWith("issue-1", "status", "IN_REVIEW"));
  });

  it("commits a successful status change back to the parent once the server confirms it", async () => {
    const { promise, resolve } = deferred<{ success: true }>();
    vi.mocked(updateIssueFieldAction).mockReturnValueOnce(promise as any);
    const handleUpdate = vi.fn();

    render(
      <IssueDetailDrawer
        issue={sampleIssue}
        onClose={vi.fn()}
        onUpdateIssue={handleUpdate}
        onDeleteIssue={vi.fn()}
        availableUsers={[{ id: "user-1", name: "Alice Dev" }, { id: "user-2", name: "Bob Lead" }]}
      />
    );

    const statusSelect = screen.getByDisplayValue("IN PROGRESS") as HTMLSelectElement;
    fireEvent.change(statusSelect, { target: { value: "IN_REVIEW" } });
    await waitFor(() => expect(statusSelect.value).toBe("IN_REVIEW"));

    resolve({ success: true });

    await waitFor(() =>
      expect(handleUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: "IN_REVIEW" }))
    );
  });

  it("rolls back a status change and surfaces the failure when the server rejects it (e.g. canUserChangeStatus denies it)", async () => {
    const { promise, resolve } = deferred<{ error: string }>();
    vi.mocked(updateIssueFieldAction).mockReturnValueOnce(promise as any);
    const handleUpdate = vi.fn();

    render(
      <IssueDetailDrawer
        issue={sampleIssue}
        onClose={vi.fn()}
        onUpdateIssue={handleUpdate}
        onDeleteIssue={vi.fn()}
        availableUsers={[{ id: "user-1", name: "Alice Dev" }, { id: "user-2", name: "Bob Lead" }]}
      />
    );

    const statusSelect = screen.getByDisplayValue("IN PROGRESS") as HTMLSelectElement;
    fireEvent.change(statusSelect, { target: { value: "IN_REVIEW" } });

    // Instant optimistic paint, before the (still-pending) server call settles.
    await waitFor(() => expect(statusSelect.value).toBe("IN_REVIEW"));

    // Server rejects — e.g. canUserChangeStatus() denied a non-assignee.
    resolve({ error: "PERMISSION_DENIED_ASSIGNEE_ONLY" });

    // The field must revert to its previous value...
    await waitFor(() => expect(statusSelect.value).toBe("IN_PROGRESS"));
    // ...and the failure must be surfaced to the user.
    expect(
      await screen.findByText(/Could not update status: PERMISSION_DENIED_ASSIGNEE_ONLY/)
    ).toBeInTheDocument();
    // The rejected value must never have been committed to the parent's issue list.
    expect(handleUpdate).not.toHaveBeenCalled();
  });

  it("shows a posted comment immediately and keeps it after the server confirms it", async () => {
    const { promise, resolve } = deferred<{ success: true }>();
    vi.mocked(postCommentAction).mockReturnValueOnce(promise as any);

    render(
      <IssueDetailDrawer issue={sampleIssue} onClose={vi.fn()} onUpdateIssue={vi.fn()} onDeleteIssue={vi.fn()} />
    );

    const textarea = screen.getByPlaceholderText(/Type your comment or update/i);
    fireEvent.change(textarea, { target: { value: "Looks good to me" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => expect(screen.getByText("Looks good to me")).toBeInTheDocument());

    resolve({ success: true });

    // Stays visible once the transition settles, since a successful post
    // commits the provisional row into permanent state.
    await waitFor(() => expect(postCommentAction).toHaveBeenCalledWith("issue-1", "Looks good to me"));
    expect(screen.getByText("Looks good to me")).toBeInTheDocument();
  });

  it("shows a posted comment immediately and removes it when the server rejects the post", async () => {
    const { promise, resolve } = deferred<{ error: string }>();
    vi.mocked(postCommentAction).mockReturnValueOnce(promise as any);

    render(
      <IssueDetailDrawer issue={sampleIssue} onClose={vi.fn()} onUpdateIssue={vi.fn()} onDeleteIssue={vi.fn()} />
    );

    const textarea = screen.getByPlaceholderText(/Type your comment or update/i);
    fireEvent.change(textarea, { target: { value: "Shipping this now" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() =>
      expect(screen.getByText("Shipping this now", { selector: "p" })).toBeInTheDocument()
    );

    resolve({ error: "You don't have access to this board" });

    // The comment row must be gone. (The textarea itself is restored with
    // this same text so the user doesn't lose what they typed — checked
    // separately below — so this assertion is scoped to the rendered <p>.)
    await waitFor(() =>
      expect(screen.queryByText("Shipping this now", { selector: "p" })).not.toBeInTheDocument()
    );
    expect(textarea).toHaveValue("Shipping this now");
    expect(
      await screen.findByText(/Could not post comment: You don't have access to this board/)
    ).toBeInTheDocument();
  });
});
