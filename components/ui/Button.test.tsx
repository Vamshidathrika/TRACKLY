import { render, screen } from "@testing-library/react";
import { Button } from "./Button";

it("renders primary appearance with brand background class", () => {
  render(<Button appearance="primary">Create</Button>);
  const btn = screen.getByRole("button", { name: "Create" });
  expect(btn.className).toContain("bg-brand");
});
it("defaults to default appearance", () => {
  render(<Button>Cancel</Button>);
  expect(screen.getByRole("button").className).toContain("bg-neutral");
});
