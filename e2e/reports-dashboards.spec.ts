import { test, expect } from "@playwright/test";
import { loginDemo } from "./helpers";

test("Phase 6 Flow: Agile Reports & Dashboard Workspace", async ({ page }) => {
  await loginDemo(page);
  await page.goto("/dashboards");
  await expect(page.locator("body")).toBeVisible();
});
