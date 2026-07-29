import { test, expect } from "@playwright/test";

const email = `e2e-${Date.now()}@test.dev`;

test("signup -> your work -> invite -> logout -> login", async ({ page }) => {
  await page.goto("/signup");
  // Target by field name, not placeholder: the signup placeholders are
  // presentational copy and have drifted out from under this spec before.
  await page.locator('input[name="name"]').fill("E2E User");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill("password123");
  await page.locator('input[name="siteName"]').fill("E2E Site");
  await page.getByRole("button", { name: /create workspace/i }).click();
  await expect(page).toHaveURL(/\/your-work/);
  await expect(page.getByText("Trackly")).toBeVisible();

  await page.goto("/settings/members");
  await page.getByPlaceholder("teammate@company.com").fill("friend@test.dev");
  await page.getByRole("button", { name: "Invite" }).click();
  await expect(page.getByText(/Invite link:/)).toBeVisible();

  await page.goto("/login");
  await page.getByPlaceholder("you@company.com").fill(email);
  await page.getByPlaceholder("••••••••").fill("password123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/your-work/);
});

test("unauthenticated user is redirected to login", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/your-work");
  await expect(page).toHaveURL(/\/login/);
});

test("bad credentials show generic error", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("you@company.com").fill("nobody@test.dev");
  await page.getByPlaceholder("••••••••").fill("wrongpass");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Invalid email or password")).toBeVisible();
});

