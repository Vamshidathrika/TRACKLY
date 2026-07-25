import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AICopilotDrawer } from "./AICopilotDrawer";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/app/(app)/ai/actions", () => ({
  submitCopilotCommandAction: vi.fn().mockResolvedValue({
    success: true,
    message: "Created issue DEMO-109",
  }),
}));

describe("AICopilotDrawer", () => {
  it("renders trigger button and opens Rovo AI Agent drawer", () => {
    render(<AICopilotDrawer />);

    const triggerBtn = screen.getByRole("button", { name: /rovo ai agent/i });
    expect(triggerBtn).toBeInTheDocument();

    fireEvent.click(triggerBtn);
    expect(screen.getByText("Trackly Rovo AI Suite")).toBeInTheDocument();
    expect(screen.getByText("General Copilot")).toBeInTheDocument();
    expect(screen.getByText("Task Creator")).toBeInTheDocument();
  });

  it("switches specialized agent modes and updates quick prompts", () => {
    render(<AICopilotDrawer />);

    const triggerBtn = screen.getByRole("button", { name: /rovo ai agent/i });
    fireEvent.click(triggerBtn);

    const taskCreatorBtn = screen.getByRole("button", { name: /task creator/i });
    fireEvent.click(taskCreatorBtn);

    expect(screen.getByText("creator Quick Prompts")).toBeInTheDocument();
  });
});
