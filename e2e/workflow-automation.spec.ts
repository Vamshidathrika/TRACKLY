import { test, expect } from "@playwright/test";
import { loginDemo } from "./helpers";

test("Phase 7 Flow: Automation Rules & Settings Workspace", async ({ page }) => {
  // Login first
  await loginDemo(page);

  // 1. Visit automation settings route
  await page.goto("/settings/automation");
  await expect(page.getByRole("heading", { name: "Workflow & Automation Settings" })).toBeVisible();

  // 2. Open Rule Builder
  await page.getByRole("button", { name: "Create rule" }).click();
  await expect(page.getByText("New Automation Rule")).toBeVisible();

  // 3. Fill and submit automation rule form
  await page.getByPlaceholder("e.g. Auto-welcome on issue creation").fill("Auto-welcome Comment");
  await page.getByPlaceholder(/Comment body text/).fill("Automated welcome message from Trackly!");
  await page.getByRole("button", { name: "Save Rule" }).click();

  // 4. Verify new rule appears in active list
  await expect(page.getByText("Auto-welcome Comment")).toBeVisible();
});
