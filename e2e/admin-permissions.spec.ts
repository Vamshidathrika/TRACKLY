import { test, expect } from "@playwright/test";
import { loginDemo } from "./helpers";

test("Phase 8 Flow: Project Settings & Workspace Members Administration", async ({ page }) => {
  await loginDemo(page);
  await page.goto("/settings/members");
  await expect(page.locator("body")).toContainText("Members");
});
