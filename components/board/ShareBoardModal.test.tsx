import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const shareBoardByEmailAction = vi.fn();
vi.mock("@/app/(app)/projects/[key]/settings/actions", () => ({
  shareBoardByEmailAction: (...args: unknown[]) => shareBoardByEmailAction(...args),
}));

import { ShareBoardModal } from "./ShareBoardModal";

describe("ShareBoardModal", () => {
  beforeEach(() => {
    shareBoardByEmailAction.mockReset();
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
  });

  it("copies a plain board link, not a self-enrolling join link", () => {
    render(<ShareBoardModal projectName="Mobile Redesign" projectKey="MOB" isOpen={true} />);

    expect(screen.getByText("Share Mobile Redesign")).toBeInTheDocument();
    expect(screen.getByText("MOB")).toBeInTheDocument();
    expect(screen.getByText("Invite-only board")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /copy link/i }));

    const copied = (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(copied).toContain("/projects/MOB/board");
    // The /join route used to grant workspace access to anyone who opened it.
    expect(copied).not.toContain("/join");
  });

  it("creates a real invite through the server action", async () => {
    shareBoardByEmailAction.mockResolvedValue({
      success: true,
      emailSent: true,
      recipient: "alex@trackly.com",
      inviteUrl: "http://localhost:3000/invite/tok",
    });

    render(<ShareBoardModal projectName="Mobile Redesign" projectKey="MOB" isOpen={true} />);

    fireEvent.change(screen.getByPlaceholderText("teammate@company.com"), {
      target: { value: "alex@trackly.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send link/i }));

    await waitFor(() =>
      expect(shareBoardByEmailAction).toHaveBeenCalledWith("MOB", "alex@trackly.com")
    );
    expect(await screen.findByText(/Invitation emailed to alex@trackly.com/i)).toBeInTheDocument();
  });

  it("surfaces a permission error instead of claiming success", async () => {
    shareBoardByEmailAction.mockResolvedValue({
      error: "Only board owners and workspace admins can share this board",
    });

    render(<ShareBoardModal projectName="Mobile Redesign" projectKey="MOB" isOpen={true} />);

    fireEvent.change(screen.getByPlaceholderText("teammate@company.com"), {
      target: { value: "alex@trackly.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send link/i }));

    expect(
      await screen.findByText(/Only board owners and workspace admins can share this board/i)
    ).toBeInTheDocument();
    expect(screen.queryByText(/Invitation emailed/i)).not.toBeInTheDocument();
  });
});
