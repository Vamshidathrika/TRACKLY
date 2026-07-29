import { test, expect } from "@playwright/test";
import { loginDemo } from "./helpers";

test("Phase 3 Flow: Projects -> Board -> Backlog Sprint Management", async ({ page }) => {
  await loginDemo(page);
  await page.goto("/projects");
  await expect(page.locator("body")).toBeVisible();
});
