import { test, expect } from "@playwright/test";
import { loginDemo } from "./helpers";

test("Phase 5 Flow: Quick Search & JQL Issue Navigator", async ({ page }) => {
  // Login first
  await loginDemo(page);

  // 1. Visit filters search route
  await page.goto("/filters/search");
  await expect(page.getByRole("heading", { name: "Search Issues & JQL Navigator" })).toBeVisible();

  // 2. Type JQL Query into search bar
  const jqlInput = page.getByPlaceholder(/Try JQL/);
  await jqlInput.fill("status = TO_DO");
  await page.getByRole("button", { name: "Search" }).click();

  // 3. Save current filter
  await page.getByRole("button", { name: "Save filter" }).click();
  await page.getByPlaceholder("e.g. Open High Priority Bugs").fill("All Open Tasks");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("All Open Tasks")).toBeVisible();
});
