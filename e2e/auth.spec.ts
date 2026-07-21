import { test, expect } from "@playwright/test";

const email = `e2e-${Date.now()}@test.dev`;

test("signup -> your work -> invite -> logout -> login", async ({ page }) => {
  await page.goto("/signup");
  await page.getByPlaceholder("Full name").fill("E2E User");
  await page.getByPlaceholder("Work email").fill(email);
  await page.getByPlaceholder("Password (8+ characters)").fill("password123");
  await page.getByPlaceholder("Site name (e.g. your company)").fill("E2E Site");
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page).toHaveURL(/\/your-work/);
  await expect(page.getByText("Trackly")).toBeVisible();

  await page.goto("/settings/members");
  await page.getByPlaceholder("teammate@company.com").fill("friend@test.dev");
  await page.getByRole("button", { name: "Invite" }).click();
  await expect(page.getByText(/Invite link:/)).toBeVisible();

  await page.goto("/login");
  await page.getByPlaceholder("Enter your email").fill(email);
  await page.getByPlaceholder("Enter password").fill("password123");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/your-work/);
});

test("unauthenticated user is redirected to login", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/your-work");
  await expect(page).toHaveURL(/\/login/);
});

test("bad credentials show generic error", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("Enter your email").fill("nobody@test.dev");
  await page.getByPlaceholder("Enter password").fill("wrongpass");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Invalid email or password")).toBeVisible();
});
