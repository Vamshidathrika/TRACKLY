import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/projects/SOU/retro",
}));

vi.mock("@/lib/auth", () => ({
  getAuthUser: vi.fn().mockResolvedValue({
    id: "user-1",
    name: "Vamshi",
    email: "vamshi@trackly.com",
    activeSiteId: "site-1",
  }),
}));

import { SprintRetroBoard } from "@/components/sprints/SprintRetroBoard";
import { JQLNavigator } from "@/components/search/JQLNavigator";
import { ReleaseHub } from "@/components/projects/ReleaseHub";

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

describe("E2E Core Features & Workflows Test Suite", () => {
  describe("❇️ Sprint Retrospective Suite Flow", () => {
    it("allows adding retro items, upvoting, and converting action items to backlog issues", () => {
      render(<SprintRetroBoard projectKey="SOU" />);

      expect(screen.getByText("Sprint Retrospective Suite")).toBeInTheDocument();
      expect(screen.getByText("What Went Well")).toBeInTheDocument();
      expect(screen.getByText("What Needs Improvement")).toBeInTheDocument();
      expect(screen.getByText("Action Items")).toBeInTheDocument();

      // Add retro action item first
      const textareas = screen.getAllByPlaceholderText("Type retro feedback...");
      const addBtns = screen.getAllByRole("button", { name: /add/i });
      fireEvent.change(textareas[2], { target: { value: "Fix Redis caching" } });
      fireEvent.click(addBtns[2]);

      // Convert action item to backlog task
      const convertBtns = screen.getAllByRole("button", { name: /Convert to Task/i });
      expect(convertBtns.length).toBeGreaterThan(0);

      fireEvent.click(convertBtns[0]);
      expect(screen.getByText(/Converted Action Item to live backlog task/i)).toBeInTheDocument();
    });
  });

  describe("📦 Release Versioning Hub Flow", () => {
    it("renders release versions, tracks progress, and opens release notes modal", () => {
      render(<ReleaseHub projectKey="SOU" initialReleases={testReleases} />);

      expect(screen.getByText("Releases & Versioning")).toBeInTheDocument();
      expect(screen.getByText("v1.0.0 - Initial Launch")).toBeInTheDocument();

      // View release notes modal
      const notesBtn = screen.getAllByRole("button", { name: /View Release Notes/i })[0];
      fireEvent.click(notesBtn);
      expect(screen.getByText("v1.0.0 - Initial Launch - Release Notes")).toBeInTheDocument();
    });
  });

  describe("🔍 Visual JQL Navigator & Filter Drawer Flow", () => {
    it("renders JQL search navigator and save filter controls", () => {
      render(
        <JQLNavigator
          initialJql='priority = "HIGH"'
          savedFilters={[
            { id: "f1", name: "My High Priority Bugs", jql: 'priority = "HIGH"', visibility: "WORKSPACE" },
          ]}
        />
      );

      expect(screen.getByText("Share & Save Filter")).toBeInTheDocument();
      expect(screen.getByText("My High Priority Bugs")).toBeInTheDocument();

      // Open Save Filter Modal
      const saveBtn = screen.getByRole("button", { name: /Share & Save Filter/i });
      expect(saveBtn).not.toBeDisabled();
      fireEvent.click(saveBtn);
      expect(screen.getByText("Save & Share Filter View")).toBeInTheDocument();
    });
  });
});
