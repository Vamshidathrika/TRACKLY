import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

// Server-action module (imported transitively via SettingsMenu) — stub so jsdom
// doesn't try to load next/headers at import time.
vi.mock("@/app/(app)/chrome-actions", () => ({
  setThemeAction: vi.fn(),
}));

// Remote-data components pull server actions; stub their modules so importing
// TopBar stays side-effect free even though hideRemote keeps them unrendered.
vi.mock("@/components/nav/NotificationBell", () => ({
  NotificationBell: () => <button aria-label="Notifications">Notifications</button>,
}));

vi.mock("@/components/nav/UserMenu", () => ({
  UserMenu: () => <button aria-label="Your profile">Profile</button>,
}));

import { TopBar } from "./TopBar";

const user = { name: "V D", email: "v@u.com", avatarUrl: null };

it("renders logo, search, create, and fires callbacks", async () => {
  const onOpenPalette = vi.fn();
  const onOpenCreate = vi.fn();
  const onToggleSidebar = vi.fn();
  render(
    <TopBar
      user={user}
      onToggleSidebar={onToggleSidebar}
      onOpenPalette={onOpenPalette}
      onOpenCreate={onOpenCreate}
      hideRemote
    />
  );
  expect(screen.getByText("Trackly")).toBeInTheDocument();
  await userEvent.click(screen.getByPlaceholderText("Search"));
  expect(onOpenPalette).toHaveBeenCalled();
  await userEvent.click(screen.getByRole("button", { name: "Create" }));
  expect(onOpenCreate).toHaveBeenCalled();
  await userEvent.click(screen.getByLabelText("Toggle sidebar"));
  expect(onToggleSidebar).toHaveBeenCalled();
});
