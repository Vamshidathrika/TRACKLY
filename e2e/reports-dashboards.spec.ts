import { test, expect } from "@playwright/test";
import { loginDemo } from "./helpers";

test("Phase 6 Flow: Agile Reports & Dashboard Workspace", async ({ page }) => {
  // Login first
  await loginDemo(page);

  // 1. Visit project reports page
  await page.goto("/projects/DEMO/reports");
  await expect(page.getByRole("heading", { name: /Reports/i })).toBeVisible();

  // 2. Switch report tabs
  await page.getByRole("button", { name: "Velocity Chart" }).click();
  await expect(page.getByText("Sprint Velocity Chart")).toBeVisible();

  await page.getByRole("button", { name: "Cumulative Flow" }).click();
  await expect(page.getByText("Cumulative Flow Diagram")).toBeVisible();

  // 3. Visit Dashboards page
  await page.goto("/dashboards");
  await expect(page.getByRole("heading", { name: "Default Workspace Dashboard" })).toBeVisible();
  await expect(page.getByText("Project Status Summary")).toBeVisible();
  await expect(page.getByText("Priority Breakdown")).toBeVisible();
});
