import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const shareBoardByEmailAction = vi.fn();
const getOrCreateShareLinkAction = vi.fn();
const revokeShareLinkAction = vi.fn();
const removeProjectMemberAction = vi.fn();
vi.mock("@/app/(app)/projects/[key]/settings/actions", () => ({
  shareBoardByEmailAction: (...args: unknown[]) => shareBoardByEmailAction(...args),
  getOrCreateShareLinkAction: (...args: unknown[]) => getOrCreateShareLinkAction(...args),
  revokeShareLinkAction: (...args: unknown[]) => revokeShareLinkAction(...args),
  removeProjectMemberAction: (...args: unknown[]) => removeProjectMemberAction(...args),
}));

import { ShareBoardModal } from "./ShareBoardModal";

describe("ShareBoardModal", () => {
  beforeEach(() => {
    shareBoardByEmailAction.mockReset();
    getOrCreateShareLinkAction.mockReset();
    revokeShareLinkAction.mockReset();
    getOrCreateShareLinkAction.mockResolvedValue({
      success: true,
      inviteUrl: "http://localhost:3000/invite/real-token-abc",
    });
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
  });

  it("fetches a real share link on open and copies it, not a bare board URL", async () => {
    render(<ShareBoardModal projectName="Mobile Redesign" projectKey="MOB" isOpen={true} />);

    expect(screen.getByText("Share Mobile Redesign")).toBeInTheDocument();
    expect(screen.getByText("MOB")).toBeInTheDocument();
    expect(screen.getByText("Anyone with this link can join")).toBeInTheDocument();

    await waitFor(() => expect(getOrCreateShareLinkAction).toHaveBeenCalledWith("MOB"));

    const copyBtn = await screen.findByRole("button", { name: /copy link/i });
    await waitFor(() => expect(copyBtn).not.toBeDisabled());
    fireEvent.click(copyBtn);

    const copied = (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(copied).toBe("http://localhost:3000/invite/real-token-abc");
  });

  it("revokes the link and replaces it with a new one", async () => {
    revokeShareLinkAction.mockResolvedValue({ success: true });
    getOrCreateShareLinkAction
      .mockResolvedValueOnce({ success: true, inviteUrl: "http://localhost:3000/invite/first" })
      .mockResolvedValueOnce({ success: true, inviteUrl: "http://localhost:3000/invite/second" });

    render(<ShareBoardModal projectName="Mobile Redesign" projectKey="MOB" isOpen={true} />);

    await screen.findByDisplayValue("http://localhost:3000/invite/first");

    fireEvent.click(screen.getByRole("button", { name: /revoke this link/i }));

    await waitFor(() => expect(revokeShareLinkAction).toHaveBeenCalledWith("MOB"));
    expect(await screen.findByDisplayValue("http://localhost:3000/invite/second")).toBeInTheDocument();
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

  it("triggers member removal when X button is clicked and confirmed", async () => {
    removeProjectMemberAction.mockResolvedValue({ success: true });
    const onMemberRemoved = vi.fn();

    render(
      <ShareBoardModal
        projectName="Mobile Redesign"
        projectKey="MOB"
        projectId="proj-123"
        isOpen={true}
        availableUsers={[{ id: "user-1", name: "Alex Smith" }]}
        onMemberRemoved={onMemberRemoved}
      />
    );

    const removeBtn = screen.getByRole("button", { name: /Remove Alex Smith from board/i });
    fireEvent.click(removeBtn);

    expect(screen.getByText("Remove member?")).toBeInTheDocument();

    const confirmBtn = screen.getByRole("button", { name: /^Remove$/i });
    fireEvent.click(confirmBtn);

    await waitFor(() =>
      expect(removeProjectMemberAction).toHaveBeenCalledWith("proj-123", "user-1")
    );
    expect(onMemberRemoved).toHaveBeenCalledWith("user-1");
  });
});

