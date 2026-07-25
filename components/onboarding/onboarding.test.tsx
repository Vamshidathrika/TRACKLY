import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RoleSelectStep } from "./RoleSelectStep";
import { TemplateSelectStep } from "./TemplateSelectStep";

describe("Onboarding Steps", () => {
  it("renders RoleSelectStep and triggers next callback with selected role", () => {
    const handleNext = vi.fn();
    render(<RoleSelectStep onNext={handleNext} />);

    expect(screen.getByText("What best describes your primary role?")).toBeDefined();
    expect(screen.getByText("Product Manager")).toBeDefined();
    expect(screen.getByText("Software Engineer")).toBeDefined();

    const continueBtn = screen.getByRole("button", { name: /Continue to Template Selection/i });
    fireEvent.click(continueBtn);
    expect(handleNext).toHaveBeenCalled();
  });

  it("renders TemplateSelectStep with Kanban pre-selected", () => {
    const handleSelect = vi.fn();
    render(<TemplateSelectStep onSelect={handleSelect} />);

    expect(screen.getByText("Select Your Project Template")).toBeDefined();
    expect(screen.getByText("Kanban Software")).toBeDefined();
    expect(screen.getByText("Agile Scrum")).toBeDefined();
    expect(screen.getByText("Web & UI Design")).toBeDefined();

    const submitBtn = screen.getByRole("button", { name: /Use Kanban Software Preset/i });
    fireEvent.click(submitBtn);
    expect(handleSelect).toHaveBeenCalledWith("KANBAN", ["To Do", "In Progress", "In Review", "Done"]);
  });
});
