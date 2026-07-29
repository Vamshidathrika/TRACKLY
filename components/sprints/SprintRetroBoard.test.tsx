import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// ─── Mock server actions ──────────────────────────────────────────────────────
vi.mock("@/app/(app)/projects/[key]/retro/actions", () => ({
  addRetroCardAction: vi.fn(),
  deleteRetroCardAction: vi.fn(),
  voteRetroCardAction: vi.fn(),
  unvoteRetroCardAction: vi.fn(),
  convertRetroCardToIssueAction: vi.fn(),
  aiSynthesizeRetroAction: vi.fn(),
}));

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

import { SprintRetroBoard } from "./SprintRetroBoard";
import type { RetroCardData, SprintOption, SprintHealthSummary } from "@/lib/retro";
import {
  addRetroCardAction,
  voteRetroCardAction,
  unvoteRetroCardAction,
  convertRetroCardToIssueAction,
} from "@/app/(app)/projects/[key]/retro/actions";

// ─── Test Fixtures ────────────────────────────────────────────────────────────

const SPRINT_OPTIONS: SprintOption[] = [
  { id: "sp-1", name: "Sprint 7", status: "CLOSED", endDate: new Date("2026-07-15") },
];

const MEMBERS = [
  { id: "u1", name: "Alice", email: "alice@example.com", avatarUrl: null },
  { id: "u2", name: "Bob", email: "bob@example.com", avatarUrl: null },
];

const SPRINT_HEALTH: SprintHealthSummary = {
  sprintName: "Sprint 7",
  totalIssues: 10,
  doneCount: 8,
  completionPct: 80,
  totalStoryPoints: 30,
  doneStoryPoints: 25,
  blockedCount: 0,
  avgCycleTimeHours: 24,
  startDate: new Date("2026-07-01"),
  endDate: new Date("2026-07-15"),
};

const SAMPLE_CARD: RetroCardData = {
  id: "card-1",
  column: "WENT_WELL",
  text: "Great sprint velocity this week",
  authorId: "u1",
  authorName: "Alice",
  isAnonymous: false,
  voteCount: 2,
  hasUserVoted: false,
  convertedIssueId: null,
  convertedIssueKey: null,
  assigneeId: null,
  assigneeName: null,
  createdAt: new Date(),
};

const ACTION_CARD: RetroCardData = {
  ...SAMPLE_CARD,
  id: "card-2",
  column: "ACTION_ITEMS",
  text: "Set up automated regression alerts",
  voteCount: 1,
};

const defaultProps = {
  projectKey: "PRJ",
  projectId: "proj-1",
  currentUserId: "u1",
  sprintOptions: SPRINT_OPTIONS,
  selectedSprintId: "sp-1",
  initialCards: [SAMPLE_CARD],
  sprintHealth: SPRINT_HEALTH,
  members: MEMBERS,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("SprintRetroBoard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (addRetroCardAction as any).mockResolvedValue({ success: true, card: SAMPLE_CARD });
    (voteRetroCardAction as any).mockResolvedValue({ success: true, voteCount: 3, hasUserVoted: true });
    (unvoteRetroCardAction as any).mockResolvedValue({ success: true, voteCount: 1, hasUserVoted: false });
    (convertRetroCardToIssueAction as any).mockResolvedValue({
      success: true,
      issueId: "issue-42",
      issueKey: "PRJ-42",
    });
  });

  it("renders 3 columns with correct titles", () => {
    render(<SprintRetroBoard {...defaultProps} />);
    expect(screen.getByText("What Went Well")).toBeInTheDocument();
    expect(screen.getByText("Needs Improvement")).toBeInTheDocument();
    expect(screen.getByText("Action Items")).toBeInTheDocument();
  });

  it("renders sprint health panel with real stats", () => {
    render(<SprintRetroBoard {...defaultProps} />);
    expect(screen.getByText("80%")).toBeInTheDocument();       // completion
    expect(screen.getByText("25")).toBeInTheDocument();         // velocity
    expect(screen.getByText("1d 0h")).toBeInTheDocument();      // cycle time
  });

  it("renders initial cards from server props", () => {
    render(<SprintRetroBoard {...defaultProps} />);
    expect(screen.getByText("Great sprint velocity this week")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("calls addRetroCardAction on Add button click", async () => {
    render(<SprintRetroBoard {...defaultProps} />);
    const textarea = screen.getByPlaceholderText("What worked great this sprint…");
    fireEvent.change(textarea, { target: { value: "New retro item" } });

    const addBtns = screen.getAllByRole("button", { name: /^Add$/i });
    fireEvent.click(addBtns[0]);

    await waitFor(() => {
      expect(addRetroCardAction).toHaveBeenCalledWith(
        expect.objectContaining({
          sprintId: "sp-1",
          projectId: "proj-1",
          column: "WENT_WELL",
          text: "New retro item",
        })
      );
    });
  });

  it("calls voteRetroCardAction when voting on an unvoted card", async () => {
    render(<SprintRetroBoard {...defaultProps} />);
    const voteBtns = screen.getAllByTitle(/Vote for this/i);
    fireEvent.click(voteBtns[0]);

    await waitFor(() => {
      expect(voteRetroCardAction).toHaveBeenCalledWith("card-1");
    });
  });

  it("renders action item convert button and calls convertRetroCardToIssueAction", async () => {
    render(
      <SprintRetroBoard
        {...defaultProps}
        initialCards={[ACTION_CARD]}
      />
    );

    const convertBtn = screen.getByText("Create task");
    fireEvent.click(convertBtn);

    await waitFor(() => {
      expect(convertRetroCardToIssueAction).toHaveBeenCalledWith("card-2", null);
    });
  });

  it("shows empty sprint state when no sprints are available", () => {
    render(
      <SprintRetroBoard
        {...defaultProps}
        sprintOptions={[]}
        selectedSprintId={null}
        initialCards={[]}
        sprintHealth={null}
      />
    );
    expect(screen.getByText(/No sprints to retro on yet/i)).toBeInTheDocument();
  });

  it("toggles anonymous mode — hides other authors' names", () => {
    const otherUserCard: RetroCardData = {
      ...SAMPLE_CARD,
      authorId: "u2",
      authorName: "Bob",
    };
    render(<SprintRetroBoard {...defaultProps} initialCards={[otherUserCard]} />);
    expect(screen.getByText("Bob")).toBeInTheDocument();

    const anonBtn = screen.getByRole("button", { name: /Anon: OFF/i });
    fireEvent.click(anonBtn);

    expect(screen.queryByText("Bob")).not.toBeInTheDocument();
    expect(screen.getByText("Anonymous Teammate")).toBeInTheDocument();
  });

  it("filters cards by search query", () => {
    const cards = [
      SAMPLE_CARD,
      { ...SAMPLE_CARD, id: "card-x", text: "Deployment pipeline is too slow" },
    ];
    render(<SprintRetroBoard {...defaultProps} initialCards={cards} />);

    const searchInput = screen.getByPlaceholderText(/Filter feedback cards/i);
    fireEvent.change(searchInput, { target: { value: "pipeline" } });

    expect(screen.queryByText("Great sprint velocity this week")).not.toBeInTheDocument();
    expect(screen.getByText("Deployment pipeline is too slow")).toBeInTheDocument();
  });

  it("shows sprint selector with real sprint options", () => {
    render(<SprintRetroBoard {...defaultProps} />);
    expect(screen.getByDisplayValue("Sprint 7")).toBeInTheDocument();
  });

  it("shows real team members in assignee dropdown for action items", () => {
    render(
      <SprintRetroBoard
        {...defaultProps}
        initialCards={[ACTION_CARD]}
      />
    );
    // Real team member options should be present
    const selects = screen.getAllByTitle("Assign to…");
    expect(selects.length).toBeGreaterThan(0);
  });
});
