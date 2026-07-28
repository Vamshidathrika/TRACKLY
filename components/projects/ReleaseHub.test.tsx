import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/app/(app)/projects/[key]/dev/actions", () => ({
  fetchDevDashboardDataAction: vi.fn().mockResolvedValue({ hasConnectedRepo: false }),
  connectGithubRepoAction: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/app/(app)/projects/[key]/releases/actions", () => ({
  createReleaseAction: vi.fn().mockResolvedValue({ success: true }),
  getReleasesAction: vi.fn().mockResolvedValue({ success: true, releases: [] }),
  updateReleaseNotesAction: vi.fn().mockResolvedValue({ success: true }),
}));

import { ReleaseHub } from "./ReleaseHub";

const testReleases = [
  {
    id: "rel-1",
    name: "v1.0.0 - Initial Launch",
    description: "Production MVP release",
    status: "RELEASED" as const,
    releaseDate: "2026-07-24",
    completedIssues: 12,
    totalIssues: 12,
    notesMarkdown: "## 🚀 Release v1.0.0 Notes",
  },
];

describe("ReleaseHub", () => {
  it("renders release version list and creates a new release version", () => {
    render(<ReleaseHub projectKey="PRJ" initialReleases={testReleases} />);

    expect(screen.getByText("Releases & Versioning")).toBeInTheDocument();
    expect(screen.getByText("v1.0.0 - Initial Launch")).toBeInTheDocument();

    const newVersionBtn = screen.getByRole("button", { name: /new version/i });
    fireEvent.click(newVersionBtn);

    expect(screen.getByText("Create Release Version")).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText(/e.g. v1.2.0/i);
    fireEvent.change(nameInput, { target: { value: "v2.0.0 - Major Refactor" } });

    const createButtons = screen.getAllByRole("button", { name: "Create Version" });
    fireEvent.click(createButtons[createButtons.length - 1]);

    expect(screen.getByText("v2.0.0 - Major Refactor")).toBeInTheDocument();
  });


  it("opens release notes modal when View Release Notes is clicked", () => {
    render(<ReleaseHub projectKey="PRJ" initialReleases={testReleases} />);

    const viewNotesBtns = screen.getAllByText("View Release Notes");
    fireEvent.click(viewNotesBtns[0]);

    expect(screen.getByText("v1.0.0 - Initial Launch - Release Notes")).toBeInTheDocument();
    expect(screen.getByDisplayValue(/Release v1.0.0 Notes/i)).toBeInTheDocument();
  });
});
