import { expect } from "@playwright/test";

export async function loginDemo(page: import("@playwright/test").Page) {
  await page.goto("/signup");
  const uniqueEmail = `demo-${Date.now()}-${Math.floor(Math.random() * 10000)}@trackly.dev`;
  // Target the form fields by name, not by placeholder: placeholders are
  // presentational copy and drifted out from under this helper once already,
  // silently breaking every spec that logs in.
  await page.locator('input[name="name"]').fill("Demo User");
  await page.locator('input[name="email"]').fill(uniqueEmail);
  await page.locator('input[name="password"]').fill("password123");
  await page.locator('input[name="siteName"]').fill("Demo Workspace");
  await page.getByRole("button", { name: /create workspace/i }).click();
  await expect(page).toHaveURL(/\/your-work/);
}

