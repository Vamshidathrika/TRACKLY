import { test, expect } from "@playwright/test";

test("Phase 3 Flow: Projects -> Board -> Backlog Sprint Management", async ({ page }) => {
  // 1. Visit projects directly (auth bypassed)
  await page.goto("/projects/DEMO");
  await expect(page.getByText("Demo Software Project")).toBeVisible();

  // 2. Navigate to Board via sidebar link
  await page.click("text=Board");
  await expect(page).toHaveURL(/\/projects\/DEMO\/board/);
  await expect(page.getByText("TO DO")).toBeVisible();
  await expect(page.getByText("IN PROGRESS")).toBeVisible();

  // 3. Navigate to Backlog via sidebar link
  await page.click("text=Backlog");
  await expect(page).toHaveURL(/\/projects\/DEMO\/backlog/);
  await expect(page.getByText("Sprint Planning & Backlog")).toBeVisible();

  // 4. Create a new sprint
  await page.getByRole("button", { name: "Create sprint" }).click();
  await expect(page.getByText("Sprint 1")).toBeVisible();
});
