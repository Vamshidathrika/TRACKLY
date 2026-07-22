import { test, expect } from "@playwright/test";
import { loginDemo } from "./helpers";

test("Phase 8 Flow: Project Settings & Workspace Members Administration", async ({ page }) => {
  // Login first
  await loginDemo(page);

  // 1. Visit project settings page
  await page.goto("/projects/DEMO/settings");
  await expect(page.getByRole("heading", { name: /Settings/i })).toBeVisible();

  // 2. Switch to Custom Fields tab and create a custom field
  await page.getByRole("button", { name: "Custom Fields" }).click();
  await expect(page.getByText("Add Custom Field")).toBeVisible();

  await page.getByPlaceholder("e.g. Environment, Customer ID").fill("Environment Tier");
  await page.getByRole("button", { name: "Add Field" }).click();
  await expect(page.getByText("Environment Tier")).toBeVisible();

  // 3. Visit Workspace Members settings
  await page.goto("/settings/members");
  await expect(page.getByText("Workspace Members")).toBeVisible();
});
