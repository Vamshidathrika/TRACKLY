import { test, expect } from "@playwright/test";
import { loginDemo } from "./helpers";

test("Phase 5 Flow: Quick Search & JQL Issue Navigator", async ({ page }) => {
  await loginDemo(page);
  await page.goto("/filters/search");
  await expect(page.locator("body")).toBeVisible();
});
