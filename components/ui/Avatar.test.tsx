import { render, screen } from "@testing-library/react";
import { Avatar } from "./Avatar";

it("renders initials when no src", () => {
  render(<Avatar name="Vamshi Dathrika" />);
  expect(screen.getByText("VD")).toBeInTheDocument();
});
it("renders img when src given", () => {
  render(<Avatar name="V" src="/x.png" />);
  expect(screen.getByRole("img")).toHaveAttribute("src", "/x.png");
});
