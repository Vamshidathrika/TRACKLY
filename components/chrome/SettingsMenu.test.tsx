import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, vi } from "vitest";
import { setThemeAction } from "@/app/(app)/chrome-actions";

// Server action pulls next/headers at import time; stub it.
vi.mock("@/app/(app)/chrome-actions", () => ({
  setThemeAction: vi.fn(),
}));

import { SettingsMenu } from "./SettingsMenu";

beforeAll(() => {
  // jsdom lacks these; Radix's dropdown and choose() rely on them.
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});

beforeEach(() => {
  vi.mocked(setThemeAction).mockClear();
  document.documentElement.removeAttribute("data-theme");
});

it("applies the Dark theme and persists the raw preference", async () => {
  // Radix guards clicks with pointer-events; skip the check in jsdom.
  const u = userEvent.setup({ pointerEventsCheck: 0 });
  render(<SettingsMenu />);

  await u.click(screen.getByLabelText("Settings"));
  // Radix renders the menu into a portal.
  const dark = await screen.findByText("Dark");
  await u.click(dark);

  expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  expect(setThemeAction).toHaveBeenCalledWith("dark");
});
