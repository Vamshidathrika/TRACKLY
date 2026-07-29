import { test, expect } from "@playwright/test";

const email = `e2e-${Date.now()}@test.dev`;

// Signup and login are multi-write flows (user + site + membership, plus a
// bcrypt hash) and each write is a database round trip. Against a remote
// cluster that comfortably exceeds Playwright's 5s default expect timeout, so
// the navigation assertions that follow them get an explicit, generous budget.
const AUTH_NAV_TIMEOUT = 30_000;

test("signup -> your work -> invite -> logout -> login", async ({ page }) => {
  await page.goto("/signup");
  // Target by field name, not placeholder: the signup placeholders are
  // presentational copy and have drifted out from under this spec before.
  await page.locator('input[name="name"]').fill("E2E User");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill("password123");
  await page.locator('input[name="siteName"]').fill("E2E Site");
  await page.getByRole("button", { name: /create workspace/i }).click();
  await expect(page).toHaveURL(/\/your-work/, { timeout: AUTH_NAV_TIMEOUT });
  await expect(page.getByText("Trackly").first()).toBeVisible();

  await page.goto("/settings/members");
  await page.getByPlaceholder("teammate@company.com").fill("friend@test.dev");
  await page.getByRole("button", { name: /send invite/i }).click();
  // The form shows one of two confirmations depending on whether the invite
  // email actually went out, so accept either rather than only the link case.
  await expect(
    page.getByText(/Invite link generated|Invitation email sent/)
  ).toBeVisible({ timeout: AUTH_NAV_TIMEOUT });

  await page.goto("/login");
  await page.getByPlaceholder("you@company.com").fill(email);
  await page.getByPlaceholder("••••••••").fill("password123");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/your-work/, { timeout: AUTH_NAV_TIMEOUT });
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

