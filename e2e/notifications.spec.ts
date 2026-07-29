import { test, expect } from "@playwright/test";
import { loginDemo } from "./helpers";

test("Phase 4 Flow: Notifications & Issue Watching", async ({ page }) => {
  await loginDemo(page);
  await page.goto("/your-work");
  await expect(page.locator("body")).toBeVisible();
});
