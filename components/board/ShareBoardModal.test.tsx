import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ShareBoardModal } from "./ShareBoardModal";

describe("ShareBoardModal", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
  });

  it("renders board sharing title, project key, copy link button, and shared link badge", () => {
    render(<ShareBoardModal projectName="Mobile Redesign" projectKey="MOB" isOpen={true} />);

    expect(screen.getByText("Share Mobile Redesign")).toBeInTheDocument();
    expect(screen.getByText("MOB")).toBeInTheDocument();
    expect(screen.getByText("Shared Board Access Active")).toBeInTheDocument();

    const copyBtn = screen.getByRole("button", { name: /copy link/i });
    fireEvent.click(copyBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining("/projects/MOB/join"));
  });

  it("sends teammate invitation when form is submitted", () => {
    render(<ShareBoardModal projectName="Mobile Redesign" projectKey="MOB" isOpen={true} />);

    const emailInput = screen.getByPlaceholderText("teammate@company.com");
    fireEvent.change(emailInput, { target: { value: "alex@trackly.com" } });

    const sendBtn = screen.getByRole("button", { name: /send link/i });
    fireEvent.click(sendBtn);

    expect(screen.getByText(/Invitation sent to alex@trackly.com!/i)).toBeInTheDocument();
  });
});
