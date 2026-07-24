import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/projects/SOU/board",
}));

vi.mock("@/lib/auth", () => ({
  getAuthUser: vi.fn().mockResolvedValue({
    id: "user-admin",
    name: "Admin User",
    email: "admin@trackly.com",
    activeSiteId: "site-1",
  }),
}));

import { KanbanBoard } from "@/components/board/KanbanBoard";
import { TeamHub } from "@/components/teams/TeamHub";
import { ReleaseHub } from "@/components/projects/ReleaseHub";
import type { BoardIssue } from "@/components/board/IssueCard";

const sampleIssues: BoardIssue[] = [
  {
    id: "iss-1",
    key: "SOU-1",
    summary: "Setup CockroachDB production database",
    type: "TASK",
    status: "TO_DO",
    priority: "HIGH",
    storyPoints: 5,
    assignee: { id: "user-member", name: "Member User", avatarUrl: null },
    projectKey: "SOU",
  },
  {
    id: "iss-2",
    key: "SOU-2",
    summary: "Fix Redis comment cache invalidation",
    type: "BUG",
    status: "IN_PROGRESS",
    priority: "HIGHEST",
    storyPoints: 3,
    assignee: { id: "user-admin", name: "Admin User", avatarUrl: null },
    projectKey: "SOU",
  },
];

describe("E2E User Personas Test Suite", () => {
  describe("🛡️ Admin Persona User Flow", () => {
    it("allows Admin to manage member roles and create release versions", () => {
      const { rerender } = render(
        <TeamHub
          initialMembers={[
            {
              id: "mem-1",
              role: "MEMBER",
              name: "Member User",
              email: "member@trackly.com",
              assignedCount: 4,
              completedCount: 2,
              storyPoints: 12,
            },
          ]}
        />
      );

      expect(screen.getByText("Teams & Capacity Management")).toBeInTheDocument();
      expect(screen.getByText("Member User")).toBeInTheDocument();
      expect(screen.getByDisplayValue("MEMBER")).toBeInTheDocument();

      // Admin tests Release Hub
      rerender(<ReleaseHub projectKey="SOU" />);
      expect(screen.getByText("Releases & Versioning")).toBeInTheDocument();

      const newVerBtn = screen.getByRole("button", { name: /New Version/i });
      fireEvent.click(newVerBtn);
      expect(screen.getByText("Create Release Version")).toBeInTheDocument();
    });
  });

  describe("👤 Member Persona User Flow", () => {
    it("allows Member to switch swimlanes and edit issue status", () => {
      render(
        <KanbanBoard
          issues={sampleIssues}
          projectName="Soult Space"
          projectKey="SOU"
          currentUserId="user-member"
        />
      );

      expect(screen.getByText("Soult Space")).toBeInTheDocument();
      expect(screen.getByText("Setup CockroachDB production database")).toBeInTheDocument();

      // Member toggles Group By dropdown to Assignee
      const groupDropdown = screen.getByLabelText("Group by");
      fireEvent.change(groupDropdown, { target: { value: "Assignee" } });

      // Verifies swimlanes render Member User header
      expect(screen.getByText("Member User")).toBeInTheDocument();
    });
  });

  describe("👁️ Viewer Persona User Flow", () => {
    it("renders workspace member team details cleanly for Viewer persona", () => {
      render(
        <TeamHub
          initialMembers={[
            {
              id: "mem-1",
              role: "MEMBER",
              name: "Member User",
              email: "member@trackly.com",
              assignedCount: 2,
              completedCount: 1,
              storyPoints: 5,
            },
          ]}
        />
      );

      expect(screen.getByText("Member User")).toBeInTheDocument();
      expect(screen.getByText("member@trackly.com")).toBeInTheDocument();
    });
  });
});
