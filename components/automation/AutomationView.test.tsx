import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AutomationView, AutomationRuleItem } from "./AutomationView";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/app/(app)/settings/automation/actions", () => ({
  createAutomationRuleAction: vi.fn().mockResolvedValue({ id: "rule-2" }),
  toggleAutomationRuleAction: vi.fn().mockResolvedValue({ success: true }),
}));

const initialRules: AutomationRuleItem[] = [
  {
    id: "rule-1",
    name: "Auto Assign On Create",
    eventTrigger: "ISSUE_CREATED",
    action: "ASSIGN_USER",
    targetValue: "Sarah Connor",
    enabled: true,
  },
];

describe("AutomationView", () => {
  it("renders existing automation rules and toggles enable switch", () => {
    render(<AutomationView projectId="prj-1" rules={initialRules} />);

    expect(screen.getByText("Automation Rules")).toBeInTheDocument();
    expect(screen.getByText("Auto Assign On Create")).toBeInTheDocument();

    const toggleBtn = screen.getByRole("button", { name: "" }); // switch toggle
    fireEvent.click(toggleBtn);
    expect(screen.getByText("Disabled")).toBeInTheDocument();
  });

  it("opens rule builder and compiles rule via AI natural language prompt", async () => {
    render(<AutomationView projectId="prj-1" rules={initialRules} />);

    const createBtn = screen.getByRole("button", { name: /create rule/i });
    fireEvent.click(createBtn);

    expect(screen.getByText("✨ AI Natural Language Rule Creator")).toBeInTheDocument();

    const aiInput = screen.getByPlaceholderText(/When a high priority task is created/i);
    fireEvent.change(aiInput, { target: { value: "When new issue created assign to Sarah" } });

    const compileBtn = screen.getByRole("button", { name: /compile rule/i });
    fireEvent.click(compileBtn);
  });
});
