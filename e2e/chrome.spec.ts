import { test, expect, type Page } from "@playwright/test";

const suffix = Date.now();
const email = `chrome-${suffix}@test.dev`;
const password = "password123";
const siteName = `Chrome Site ${suffix}`;

const MOD = process.platform === "darwin" ? "Meta" : "Control";

test.beforeAll(async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/signup");
  await page.getByPlaceholder("Full name").fill("Chrome User");
  await page.getByPlaceholder("Work email").fill(email);
  await page.getByPlaceholder("Password (8+ characters)").fill(password);
  await page.getByPlaceholder("Site name (e.g. your company)").fill(siteName);
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page).toHaveURL(/\/your-work/);
  await context.close();
});

async function login(page: Page) {
  await page.goto("/login");
  await page.getByPlaceholder("e.g. demo@trackly.dev").fill(email);
  await page.getByPlaceholder("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/your-work/);
}

/** TopBar renders a <header>; GlobalSidebar renders the only <nav> on /your-work. */
const topbar = (page: Page) => page.getByRole("banner");
const sidebar = (page: Page) => page.getByRole("navigation");

test("chrome renders topbar and global sidebar after login", async ({ page }) => {
  await login(page);

  await expect(topbar(page)).toBeVisible();
  await expect(topbar(page).getByRole("link", { name: "Trackly" })).toBeVisible();
  await expect(topbar(page).getByLabel("Toggle sidebar")).toBeVisible();
  await expect(topbar(page).getByPlaceholder("Search", { exact: true })).toBeVisible();
  await expect(topbar(page).getByRole("button", { name: "Create", exact: true })).toBeVisible();
  await expect(topbar(page).getByLabel("Settings")).toBeVisible();

  await expect(sidebar(page)).toBeVisible();
  await expect(sidebar(page).getByRole("link", { name: "Your work" })).toBeVisible();
  await expect(sidebar(page).getByRole("link", { name: "View all projects" })).toBeVisible();
  await expect(sidebar(page).getByRole("link", { name: "Filters" })).toBeVisible();
  await expect(sidebar(page).getByRole("link", { name: "Dashboards" })).toBeVisible();
});

test("command palette opens with mod+k and navigates", async ({ page }) => {
  await login(page);

  const paletteInput = page.getByPlaceholder("Search or jump to...");
  // The keydown listener is attached on hydration, which can land after the URL
  // assertion in login(), so retry the keypress until the palette responds.
  await expect(async () => {
    await page.keyboard.press(`${MOD}+k`);
    await expect(paletteInput).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 15_000 });

  await page.getByRole("button", { name: "Go to Dashboards" }).click();
  await expect(page).toHaveURL(/\/dashboards/);
  await expect(paletteInput).toBeHidden();
});

test("theme choice persists across reload", async ({ page }) => {
  await login(page);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  await page.getByLabel("Settings").click();
  await page.getByRole("menuitem", { name: "Dark", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  // The preference is written to the trackly-theme cookie by a server action, so
  // wait for that round trip to land — otherwise the reload below races it and we
  // would be testing the request timing rather than persistence.
  await expect
    .poll(async () => (await page.context().cookies()).find((c) => c.name === "trackly-theme")?.value)
    .toBe("dark");

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("sidebar collapse persists across reload", async ({ page }) => {
  await login(page);
  await expect(sidebar(page).getByRole("link", { name: "Dashboards" })).toBeVisible();

  await page.getByLabel("Toggle sidebar").click();
  await expect(sidebar(page)).toHaveCount(0);

  await page.reload();
  await expect(sidebar(page)).toHaveCount(0);
  // The rest of the chrome survives the collapse.
  await expect(topbar(page).getByRole("link", { name: "Trackly" })).toBeVisible();

  // And expanding again restores the nav.
  await page.getByLabel("Toggle sidebar").click();
  await expect(sidebar(page).getByRole("link", { name: "Dashboards" })).toBeVisible();
});
