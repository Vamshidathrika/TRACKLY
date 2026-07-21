import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Sidebar } from "./Sidebar";

it("renders project header and planning group", () => {
  render(<Sidebar projectName="Demo" projectKey="DEM" />);
  expect(screen.getByText("Demo")).toBeInTheDocument();
  for (const l of ["Timeline", "Backlog", "Board", "Reports", "Project settings"]) {
    expect(screen.getByText(l)).toBeInTheDocument();
  }
});

it("collapses on chevron click", async () => {
  render(<Sidebar projectName="Demo" projectKey="DEM" />);
  await userEvent.click(screen.getByLabelText("Collapse sidebar"));
  expect(screen.queryByText("Backlog")).not.toBeInTheDocument();
});
