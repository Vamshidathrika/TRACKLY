import { test, expect } from "@playwright/test";
import { loginDemo } from "./helpers";

test("Phase 3 Flow: Projects -> Board -> Backlog Sprint Management", async ({ page }) => {
  // Login first
  await loginDemo(page);

  // 1. Visit projects directly (auth bypassed)
  await page.goto("/projects/DEMO");
  await expect(page.getByRole("heading", { name: "Demo Software Project" })).toBeVisible();

  // 2. Navigate to Board via sidebar link
  await page.getByRole("link", { name: "Board", exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/DEMO\/board/);
  await expect(page.getByRole("heading", { name: "TO DO" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "IN PROGRESS" })).toBeVisible();

  // 3. Navigate to Backlog via sidebar link
  await page.getByRole("link", { name: "Backlog", exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/DEMO\/backlog/);
  await expect(page.getByText("Sprint Planning & Backlog")).toBeVisible();

  // 4. Create a new sprint
  await page.getByRole("button", { name: "Create sprint" }).click();
  await expect(page.getByText("Sprint 1", { exact: true })).toBeVisible();
});
