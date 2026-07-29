import { test, expect, type Page } from "@playwright/test";
import { loginDemo } from "./helpers";

test.beforeEach(async ({ page }) => {
  await loginDemo(page);
});

/** TopBar renders a <header>; GlobalSidebar renders the only <nav> on /your-work. */
const topbar = (page: Page) => page.getByRole("banner");
const sidebar = (page: Page) => page.getByRole("navigation");

test("chrome renders topbar and global sidebar after login", async ({ page }) => {
  await expect(topbar(page)).toBeVisible();
  await expect(topbar(page).getByRole("link", { name: "Trackly" })).toBeVisible();
  await expect(topbar(page).getByPlaceholder(/Search tasks/)).toBeVisible();
  await expect(topbar(page).getByRole("button", { name: "Create", exact: true })).toBeVisible();
  await expect(topbar(page).getByLabel("Settings")).toBeVisible();

  await expect(sidebar(page)).toBeVisible();
  await expect(sidebar(page).getByRole("link", { name: "My Work" })).toBeVisible();
  await expect(sidebar(page).getByRole("link", { name: "View all projects" })).toBeVisible();
  await expect(sidebar(page).getByRole("link", { name: "Filters" })).toBeVisible();
  await expect(sidebar(page).getByRole("link", { name: "Dashboards" })).toBeVisible();
});

test("command palette opens with mod+k and navigates", async ({ page }) => {
  const searchInput = topbar(page).getByPlaceholder(/Search tasks/);
  await searchInput.click();

  const paletteInput = page.getByPlaceholder(/Search or jump to/);
  await expect(paletteInput).toBeVisible();

  await page.getByRole("button", { name: "Go to Dashboards" }).click();
  await page.waitForURL(/\/dashboards/);
  await expect(paletteInput).toBeHidden();
});

test("theme choice persists across reload", async ({ page }) => {
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  await page.getByLabel("Settings").click();
  await page.getByRole("menuitem", { name: "Dark", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await expect
    .poll(async () => (await page.context().cookies()).find((c) => c.name === "trackly-theme")?.value)
    .toBe("dark");

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
