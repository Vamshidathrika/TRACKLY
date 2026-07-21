import { test, expect } from "@playwright/test";

const suffix = Date.now();
const email = `chrome-${suffix}@test.dev`;
const siteName = `Chrome Site ${suffix}`;

test.beforeAll(async ({ browser }) => {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/signup");
  await page.getByPlaceholder("Full name").fill("Chrome User");
  await page.getByPlaceholder("Work email").fill(email);
  await page.getByPlaceholder("Password (8+ characters)").fill("password123");
  await page.getByPlaceholder("Site name (e.g. your company)").fill(siteName);
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page).toHaveURL(/\/your-work/);
});

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByPlaceholder("e.g. demo@trackly.dev").fill(email);
  await page.getByPlaceholder("Password").fill("password123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/your-work/);
}

test("chrome renders with sidebar and topbar", async ({ page }) => {
  await login(page);
  await expect(page.getByText("Trackly")).toBeVisible();
  await expect(page.getByRole("link", { name: "Your work" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Dashboards" })).toBeVisible();
});

test("command palette opens and navigates", async ({ page }) => {
  await login(page);
  await page.keyboard.press("Meta+k");
  await expect(page.getByPlaceholder(/Search or jump/i)).toBeVisible();
  await page.getByText("Go to Dashboards").click();
  await expect(page).toHaveURL(/\/dashboards/);
});

test("theme toggle persists across reload", async ({ page }) => {
  await login(page);
  await page.getByLabel("Settings").click();
  await page.getByText("Dark", { exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("sidebar collapse persists", async ({ page }) => {
  await login(page);
  await page.getByLabel("Toggle sidebar").click();
  await expect(page.getByRole("link", { name: "Dashboards" })).not.toBeVisible();
  await page.reload();
  await expect(page.getByRole("link", { name: "Dashboards" })).not.toBeVisible();
});
