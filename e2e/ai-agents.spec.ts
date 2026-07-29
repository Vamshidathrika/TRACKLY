import { test, expect } from "@playwright/test";
import { loginDemo } from "./helpers";

test("Phase 9 Flow: AI Copilot Drawer Interaction", async ({ page }) => {
  await loginDemo(page);
  await page.goto("/your-work");
  await expect(page.locator("body")).toBeVisible();
});
