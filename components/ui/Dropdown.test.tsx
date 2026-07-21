import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Dropdown } from "./Dropdown";

it("opens menu on trigger click and fires onSelect", async () => {
  const onSelect = vi.fn();
  render(<Dropdown trigger={<span>Projects</span>} items={[{ label: "View all projects", onSelect }]} />);
  await userEvent.click(screen.getByText("Projects"));
  await userEvent.click(await screen.findByText("View all projects"));
  expect(onSelect).toHaveBeenCalled();
});
