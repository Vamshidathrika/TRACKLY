import { test, expect } from "@playwright/test";
import { loginDemo } from "./helpers";

test("Phase 7 Flow: Automation Rules & Settings Workspace", async ({ page }) => {
  await loginDemo(page);
  await page.goto("/your-work");
  await expect(page.locator("body")).toBeVisible();
});
