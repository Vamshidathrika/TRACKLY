import { render, screen } from "@testing-library/react";
import { TopNav } from "./TopNav";

const user = { name: "Vamshi D", email: "v@u.com", avatarUrl: null };

it("renders logo, nav dropdowns, Create button, search", () => {
  render(<TopNav user={user} />);
  expect(screen.getByText("Trackly")).toBeInTheDocument();
  for (const label of ["Your work", "Projects", "Filters", "Dashboards", "Teams"]) {
    expect(screen.getByText(label)).toBeInTheDocument();
  }
  expect(screen.getByRole("button", { name: "Create" })).toBeInTheDocument();
  expect(screen.getByPlaceholderText("Search")).toBeInTheDocument();
});
