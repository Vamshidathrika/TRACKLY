import { test as setup, expect } from "@playwright/test";
import path from "path";

const authFile = path.join(__dirname, "../.playwright/user.json");

setup("authenticate", async ({ page }) => {
  await page.goto("/signup");
  const email = `setup-${Date.now()}@trackly.dev`;
  await page.locator("#signup-name").fill("Setup User");
  await page.locator("#signup-email").fill(email);
  await page.locator("#signup-password").fill("Password123");
  await page.locator("#signup-site").fill("Setup Workspace");
  await page.getByRole("button", { name: /Create Workspace|Sign up/i }).click();
  await expect(page).toHaveURL(/\/your-work|\/projects/, { timeout: 30000 });

  await page.context().storageState({ path: authFile });
});
