import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GoogleAccountStep } from "./GoogleAccountStep";
import { TemplateSelectStep } from "./TemplateSelectStep";

describe("Onboarding Steps", () => {
  it("renders GoogleAccountStep with account selector and triggers next callback", () => {
    const handleNext = vi.fn();
    render(
      <GoogleAccountStep
        onNext={handleNext}
        currentUserEmail="user@trackly.dev"
        currentUserName="Trackly Developer"
      />
    );

    expect(screen.getByText("Welcome to Trackly")).toBeDefined();
    expect(screen.getByText("Trackly Developer")).toBeDefined();

    const continueBtn = screen.getByRole("button", { name: /Continue as Trackly/i });
    fireEvent.click(continueBtn);
    expect(handleNext).toHaveBeenCalledWith("user@trackly.dev");
  });

  it("renders TemplateSelectStep with Kanban pre-selected", () => {
    const handleSelect = vi.fn();
    render(<TemplateSelectStep onSelect={handleSelect} />);

    expect(screen.getByText("Select Your Project Template")).toBeDefined();
    expect(screen.getByText("Kanban Project")).toBeDefined();
    expect(screen.getByText("Web Design Process")).toBeDefined();
    expect(screen.getByText("Scrum Software")).toBeDefined();

    const submitBtn = screen.getByRole("button", { name: /Use Kanban Project Preset/i });
    fireEvent.click(submitBtn);
    expect(handleSelect).toHaveBeenCalledWith("KANBAN", ["To Do", "In Progress", "In Review", "Done"]);
  });
});
