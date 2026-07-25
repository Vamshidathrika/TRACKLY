import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/projects/PROJ",
}));

// Mock server actions
vi.mock("@/lib/auth", () => ({
  getAuthUser: vi.fn().mockResolvedValue({ id: "user-1", name: "Test User", email: "test@example.com" }),
}));

vi.mock("@/app/(app)/filters/actions", () => ({
  executeJQLQueryAction: vi.fn().mockImplementation(async (query: string) => {
    return [
      {
        id: "issue-jql-1",
        key: "PROJ-10",
        summary: "JQL Query Match Issue",
        type: "BUG",
        status: "IN_PROGRESS",
        priority: "HIGH",
        updatedAt: new Date(),
        project: { key: "PROJ", name: "Test Project" },
        assignee: { id: "user-1", name: "Alice Smith", avatarUrl: null },
      },
    ];
  }),
  saveFilterAction: vi.fn().mockResolvedValue({
    filter: { id: "filter-1", name: "Saved Filter 1", jql: "project = PROJ" },
  }),
}));

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

// Components under test
import { TemplateSelectStep } from "@/components/onboarding/TemplateSelectStep";
import { KanbanBoard } from "@/components/board/KanbanBoard";
import { JQLNavigator } from "@/components/search/JQLNavigator";
import { ReleaseHub } from "@/components/projects/ReleaseHub";
import { SprintRetroBoard } from "@/components/sprints/SprintRetroBoard";
import type { BoardIssue } from "@/components/board/IssueCard";

const mockUsers = [
  { id: "user-1", name: "Alice Smith", avatarUrl: null },
  { id: "user-2", name: "Bob Jones", avatarUrl: null },
];

const mockIssues: BoardIssue[] = [
  {
    id: "issue-1",
    key: "PROJ-1",
    summary: "Fix Authentication Flow",
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
    summary: "Design System Migration",
    type: "STORY",
    status: "IN_PROGRESS",
    priority: "HIGH",
    storyPoints: 5,
    assignee: mockUsers[1],
    projectKey: "PROJ",
  },
];

describe("End-to-End User Flow Suite: Onboarding -> Kanban -> JQL -> Releases -> Retro", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock clipboard API
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      configurable: true,
      writable: true,
    });
  });

  describe("Step 1: Onboarding Template Selection", () => {
    it("allows user to inspect template options and select Web Design preset", async () => {
      const handleSelect = vi.fn();
      render(<TemplateSelectStep onSelect={handleSelect} />);

      // Verify onboarding template header and options render
      expect(screen.getByText("Select Your Project Template")).toBeInTheDocument();
      expect(screen.getByText("Kanban Software")).toBeInTheDocument();
      expect(screen.getByText("Web & UI Design")).toBeInTheDocument();
      expect(screen.getByText("Agile Scrum")).toBeInTheDocument();

      // Click on "Select" button for "Web & UI Design" template card
      const selectBtns = screen.getAllByRole("button", { name: /^Select$/i });
      await userEvent.click(selectBtns[1]); // Index 1 is Web & UI Design (index 0 is Scrum)

      // Submit preset selection
      const submitBtn = screen.getByRole("button", { name: /Use Web & UI Design Preset/i });
      await userEvent.click(submitBtn);

      expect(handleSelect).toHaveBeenCalledTimes(1);
      expect(handleSelect).toHaveBeenCalledWith("WEB_DESIGN", [
        "Specs",
        "Figma",
        "Dev Build",
        "QA",
        "Live Launch",
      ]);
    });

    it("defaults to Kanban template preset when confirmed immediately", async () => {
      const handleSelect = vi.fn();
      render(<TemplateSelectStep onSelect={handleSelect} />);

      const submitBtn = screen.getByRole("button", { name: /Use Kanban Software Preset/i });
      await userEvent.click(submitBtn);

      expect(handleSelect).toHaveBeenCalledWith("KANBAN", [
        "To Do",
        "In Progress",
        "In Review",
        "Done",
      ]);
    });
  });

  describe("Step 2: Kanban Board Swimlane Toggle", () => {
    it("renders single column board by default and toggles to Assignee swimlanes", async () => {
      render(
        <KanbanBoard
          issues={mockIssues}
          availableUsers={mockUsers}
          projectName="Trackly Development"
          projectKey="PROJ"
        />
      );

      // Verify default columns
      expect(screen.getByRole("heading", { name: "TO DO" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "IN PROGRESS" })).toBeInTheDocument();

      // Switch Group By to Assignee
      const groupSelect = screen.getByRole("combobox", { name: /group by/i });
      await userEvent.selectOptions(groupSelect, "Assignee");

      // Verify Assignee swimlane headers appear
      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
      expect(screen.getByText("Bob Jones")).toBeInTheDocument();
      expect(screen.getByText("1 tasks • 3 pts")).toBeInTheDocument(); // Alice
      expect(screen.getByText("1 tasks • 5 pts")).toBeInTheDocument(); // Bob
    });

    it("toggles Group By to Priority swimlanes", async () => {
      render(
        <KanbanBoard
          issues={mockIssues}
          availableUsers={mockUsers}
          projectName="Trackly Development"
          projectKey="PROJ"
        />
      );

      const groupSelect = screen.getByRole("combobox", { name: /group by/i });
      await userEvent.selectOptions(groupSelect, "Priority");

      // Verify Priority swimlane headers appear
      expect(screen.getByText("HIGHEST Priority")).toBeInTheDocument();
      expect(screen.getByText("HIGH Priority")).toBeInTheDocument();
    });
  });

  describe("Step 3: JQL Visual Builder Search", () => {
    it("builds query dynamically using Visual controls and runs search", async () => {
      const { executeJQLQueryAction } = await import("@/app/(app)/filters/actions");

      render(<JQLNavigator availableUsers={mockUsers} />);

      // Verify Visual Builder controls are rendered
      expect(screen.getByText("Visual Builder")).toBeInTheDocument();
      const projInput = screen.getByPlaceholderText("e.g. SOU, TES");
      const statusSelect = screen.getByDisplayValue("Any Status");

      // Change project and status in visual builder
      await userEvent.type(projInput, "PROJ");
      await userEvent.selectOptions(statusSelect, "IN_PROGRESS");

      // Click "Run Search" button
      const runSearchBtn = screen.getByRole("button", { name: /Run Search/i });
      await userEvent.click(runSearchBtn);

      // Verify executeJQLQueryAction was called with constructed JQL query
      expect(executeJQLQueryAction).toHaveBeenCalledWith('project = "PROJ" AND status = "IN_PROGRESS"');

      // Verify matching issue from action response is rendered in search results
      expect(await screen.findByText("JQL Query Match Issue")).toBeInTheDocument();
    });
  });

  describe("Step 4: Release Notes Copy", () => {
    it("copies markdown release notes to clipboard when Copy Notes is clicked", async () => {
      render(<ReleaseHub projectKey="PROJ" />);

      expect(screen.getByText("Releases & Versioning")).toBeInTheDocument();
      expect(screen.getByText("v1.0.0 - Initial Launch")).toBeInTheDocument();

      // Find copy button for v1.0.0
      const copyButtons = screen.getAllByRole("button", { name: /Copy Notes/i });
      expect(copyButtons.length).toBeGreaterThan(0);

      await userEvent.click(copyButtons[0]);

      // Verify navigator.clipboard.writeText was called
      expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining("## 🚀 Release v1.0.0 Notes")
      );

      // Verify visual confirmation in button state
      expect(await screen.findByText("Copied Markdown!")).toBeInTheDocument();
    });
  });

  describe("Step 5: Retro Action Item Conversion", () => {
    it("converts a retro action item to a backlog issue", async () => {
      render(<SprintRetroBoard projectKey="PROJ" />);

      expect(screen.getByText("Sprint Retrospective Suite")).toBeInTheDocument();
      expect(screen.getByText("Action Items")).toBeInTheDocument();

      // Locate convert button for Action Item card
      const convertBtn = screen.getByRole("button", { name: /Convert to Issue/i });
      expect(convertBtn).toBeInTheDocument();

      await userEvent.click(convertBtn);

      // Check conversion feedback state
      expect(await screen.findByText("In Backlog")).toBeInTheDocument();
      expect(
        screen.getByText("Converted Action Item to live backlog task in PROJ!")
      ).toBeInTheDocument();
    });
  });

  describe("Full End-to-End User Journey Flow", () => {
    it("executes seamless flow across all 5 key touchpoints", async () => {
      // Touchpoint 1: Onboarding
      const handleOnboardSelect = vi.fn();
      const { rerender } = render(<TemplateSelectStep onSelect={handleOnboardSelect} />);

      const kanbanPresetBtn = screen.getByRole("button", { name: /Use Kanban Software Preset/i });
      await userEvent.click(kanbanPresetBtn);
      expect(handleOnboardSelect).toHaveBeenCalledWith("KANBAN", ["To Do", "In Progress", "In Review", "Done"]);

      // Touchpoint 2: Board Swimlanes
      rerender(
        <KanbanBoard
          issues={mockIssues}
          availableUsers={mockUsers}
          projectName="PROJ"
          projectKey="PROJ"
        />
      );
      const groupSelect = screen.getByRole("combobox", { name: /group by/i });
      await userEvent.selectOptions(groupSelect, "Assignee");
      expect(screen.getByText("Alice Smith")).toBeInTheDocument();

      // Touchpoint 3: JQL Search
      const { executeJQLQueryAction } = await import("@/app/(app)/filters/actions");
      rerender(<JQLNavigator availableUsers={mockUsers} />);
      const projInput = screen.getByPlaceholderText("e.g. SOU, TES");
      await userEvent.type(projInput, "PROJ");
      await userEvent.click(screen.getByRole("button", { name: /Run Search/i }));
      expect(executeJQLQueryAction).toHaveBeenCalled();

      // Touchpoint 4: Release Notes Copy
      rerender(<ReleaseHub projectKey="PROJ" />);
      const copyButtons = screen.getAllByRole("button", { name: /Copy Notes/i });
      await userEvent.click(copyButtons[0]);
      expect(navigator.clipboard.writeText).toHaveBeenCalled();

      // Touchpoint 5: Retro Action Item Conversion
      rerender(<SprintRetroBoard projectKey="PROJ" />);
      const convertBtn = screen.getByRole("button", { name: /Convert to Issue/i });
      await userEvent.click(convertBtn);
      expect(screen.getByText("Converted Action Item to live backlog task in PROJ!")).toBeInTheDocument();
    });
  });
});
