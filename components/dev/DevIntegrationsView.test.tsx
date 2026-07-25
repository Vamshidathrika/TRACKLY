import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/projects/VAM/dev",
}));

vi.mock("@/app/(app)/projects/[key]/dev/actions", () => ({
  connectGithubRepoAction: vi.fn().mockResolvedValue({ success: true }),
  fetchDevDashboardDataAction: vi.fn().mockResolvedValue({
    hasConnectedRepo: false,
    repos: [],
    stats: { activeBranches: 0, openPRs: 0, mergedPRs: 0, pipelineStatus: "Idle", commits: [] },
  }),
}));

import { DevIntegrationsView } from "./DevIntegrationsView";
import { fetchDevDashboardDataAction } from "@/app/(app)/projects/[key]/dev/actions";

describe("DevIntegrationsView", () => {
  it("renders Development & Git Integrations heading and empty state when no repo connected", async () => {
    render(<DevIntegrationsView projectId="proj-1" projectKey="VAM" />);

    expect(screen.getByText(/DevOps & Code Integrations Hub/i)).toBeInTheDocument();
    expect(await screen.findAllByText(/No Repository Connected/i)).not.toHaveLength(0);
  });

  it("renders active branches stats card when repo is connected", async () => {
    (fetchDevDashboardDataAction as any).mockResolvedValueOnce({
      hasConnectedRepo: true,
      repos: [{ id: "repo-1", owner: "Vamshidathrika", repoName: "TRACKLY", createdAt: new Date() }],
      stats: {
        activeBranches: 14,
        openPRs: 2,
        mergedPRs: 5,
        pipelineStatus: "Passing",
        commits: [],
      },
    });

    render(<DevIntegrationsView projectId="proj-1" projectKey="VAM" />);

    expect(await screen.findByText("14")).toBeInTheDocument();
  });

  it("opens Connect Repository modal when button is clicked", () => {
    render(<DevIntegrationsView projectId="proj-1" projectKey="VAM" />);

    const connectBtn = screen.getByText("Connect Repository");
    fireEvent.click(connectBtn);

    expect(screen.getByText(/Owner/i)).toBeInTheDocument();
  });
});
