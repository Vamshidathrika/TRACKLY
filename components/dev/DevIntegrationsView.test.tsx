import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/projects/VAM/dev",
}));

vi.mock("@/app/(app)/projects/[key]/dev/actions", () => ({
  connectGithubRepoAction: vi.fn().mockResolvedValue({ success: true }),
  fetchDevDashboardDataAction: vi.fn().mockResolvedValue({
    hasConnectedRepo: true,
    repos: [{ id: "repo-1", owner: "Vamshidathrika", repoName: "TRACKLY", createdAt: new Date() }],
    stats: {
      activeBranches: 14,
      openPRs: 2,
      mergedPRs: 5,
      pipelineStatus: "Passing",
      commits: [
        {
          hash: "8f3a12b",
          message: "feat: add super navigation tabs",
          author: "Antigravity",
          committedAt: new Date().toISOString(),
          url: "https://github.com/Vamshidathrika/TRACKLY/commit/8f3a12b",
          taskKey: "VAM-1",
        },
      ],
    },
  }),
}));

import { DevIntegrationsView } from "./DevIntegrationsView";

describe("DevIntegrationsView", () => {
  it("renders Development & Git Integrations heading and stats cards", async () => {
    render(<DevIntegrationsView projectId="proj-1" projectKey="VAM" />);

    expect(screen.getByText(/Development & Git Integrations/i)).toBeInTheDocument();
    expect(screen.getByText(/Active Branches/i)).toBeInTheDocument();
    expect(screen.getByText(/Open Pull Requests/i)).toBeInTheDocument();
  });

  it("opens Connect Repository modal when button is clicked", () => {
    render(<DevIntegrationsView projectId="proj-1" projectKey="VAM" />);

    const connectBtn = screen.getByRole("button", { name: /\+ Connect Repository/i });
    fireEvent.click(connectBtn);

    expect(screen.getByText("Connect GitHub Repository")).toBeInTheDocument();
  });
});
