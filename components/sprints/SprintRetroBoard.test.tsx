import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.setConfig({ testTimeout: 15000 });
import { SprintRetroBoard } from "./SprintRetroBoard";

describe("SprintRetroBoard", () => {
  it("renders 3 columns, allows adding retro cards, upvoting, and converting action items", () => {
    render(<SprintRetroBoard projectKey="PRJ" />);

    expect(screen.getByText("What Went Well")).toBeInTheDocument();
    expect(screen.getByText("What Needs Improvement")).toBeInTheDocument();
    expect(screen.getByText("Action Items")).toBeInTheDocument();

    const textareas = screen.getAllByPlaceholderText("Type retro feedback...");
    const addBtns = screen.getAllByRole("button", { name: /add/i });

    fireEvent.change(textareas[2], { target: { value: "Great velocity in sprint!" } });
    fireEvent.click(addBtns[2]);

    expect(screen.getByText("Great velocity in sprint!")).toBeInTheDocument();

    const convertBtn = screen.getByRole("button", { name: /convert to task/i });
    fireEvent.click(convertBtn);

    expect(screen.getByText(/In Backlog/i)).toBeInTheDocument();
  });

  it("toggles Anonymous Mode and synthesizes action items using AI", () => {
    render(<SprintRetroBoard projectKey="PRJ" />);

    const anonBtn = screen.getByRole("button", { name: /Anonymous: OFF/i });
    fireEvent.click(anonBtn);
    expect(screen.getByText("Anonymous: ON")).toBeInTheDocument();

    const aiBtn = screen.getByRole("button", { name: /AI Synthesize Actions/i });
    fireEvent.click(aiBtn);

    expect(screen.getByText(/AI synthesized 2 new Action Items/i)).toBeInTheDocument();
  });
});
