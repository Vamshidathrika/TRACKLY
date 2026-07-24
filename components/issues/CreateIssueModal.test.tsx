import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/app/(app)/issues/actions", () => ({
  createIssueAction: vi.fn(),
  fetchUserProjectsAction: vi.fn().mockResolvedValue([
    { id: "proj-1", name: "Alpha", key: "ALP" },
  ]),
  fetchWorkspaceMembersAction: vi.fn().mockResolvedValue([
    { id: "user-1", name: "Alice", email: "alice@test.com" },
  ]),
}));

import { CreateIssueModal } from "./CreateIssueModal";

describe("CreateIssueModal", () => {
  it("renders trigger button and accepts contextual defaults", async () => {
    render(
      <CreateIssueModal
        defaultProjectId="proj-1"
        defaultStatus="IN_PROGRESS"
        defaultSprintId="sprint-10"
        defaultType="BUG"
      />
    );

    const trigger = screen.getByRole("button", { name: "Create" });
    expect(trigger).toBeInTheDocument();

    await userEvent.click(trigger);
    expect(screen.getByRole("heading", { name: "Create task" })).toBeInTheDocument();
  });
});
