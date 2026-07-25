import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { DevelopmentPanel } from "./DevelopmentPanel";

describe("DevelopmentPanel Component", () => {
  it("renders Development Activity header and summary counters", () => {
    render(<DevelopmentPanel issueKey="TRK-123" />);

    expect(screen.getByText("Development Activity")).toBeInTheDocument();
    expect(screen.getByText("Branches")).toBeInTheDocument();
    expect(screen.getAllByText("Pull Requests")[0]).toBeInTheDocument();
    expect(screen.getByText("Commits")).toBeInTheDocument();
  });

  it("displays linked PR number and status tag", () => {
    render(
      <DevelopmentPanel
        issueKey="TRK-123"
        pullRequests={[
          {
            id: "pr-1",
            prNumber: 99,
            title: "fix(TRK-123): resolve login redirect loop",
            status: "MERGED",
            authorName: "Developer",
          },
        ]}
      />
    );

    expect(screen.getByText(/#99 MERGED/i)).toBeInTheDocument();
    expect(screen.getByText("fix(TRK-123): resolve login redirect loop")).toBeInTheDocument();
  });

  it("renders Copy Branch Cmd button", () => {
    render(<DevelopmentPanel issueKey="TRK-123" />);
    expect(screen.getByText(/Copy Branch Cmd/i)).toBeInTheDocument();
  });
});
