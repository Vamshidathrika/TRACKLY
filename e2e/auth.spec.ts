import { test, expect } from "@playwright/test";

const email = `e2e-${Date.now()}@test.dev`;

test("signup -> your work -> invite -> logout -> login", async ({ page }) => {
  test.setTimeout(90000);
  await page.goto("/signup");
  await page.locator("#signup-name").fill("E2E User");
  await page.locator("#signup-email").fill(email);
  await page.locator("#signup-password").fill("Password123");
  await page.locator("#signup-site").fill("E2E Site");
  await page.getByRole("button", { name: /Create Workspace|Sign up/i }).click();
  await expect(page).toHaveURL(/\/your-work|\/projects/, { timeout: 15000 });

  await page.goto("/settings/members");
  await page.locator('input[name="email"]').fill("friend@test.dev");
  await page.getByRole("button", { name: "Send Invite", exact: true }).click();
  await expect(page.getByText(/Dispatched|Invite generated|Invitation email/i).first()).toBeVisible({ timeout: 15000 });

  await page.goto("/login");
  await page.locator("#login-email").fill(email);
  await page.locator("#login-password").fill("Password123");
  await page.getByRole("button", { name: /Sign In|Sign in/i }).click();
  await expect(page).toHaveURL(/\/your-work|\/projects/, { timeout: 15000 });
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
  await page.getByRole("button", { name: /Sign In|Sign in/i }).click();
  await expect(page.getByText("Invalid email or password")).toBeVisible();
});
