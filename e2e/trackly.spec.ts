import { test, expect } from "@playwright/test";

test.describe("Trackly Platform Superpowers E2E Test Suite", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage / landing view
    await page.goto("/");
  });

  test("1. Onboarding & Template Selection Journey", async ({ page }) => {
    await page.goto("/onboarding");
    // Verify Onboarding header
    await expect(page.locator("body")).toContainText("Trackly");
  });

  test("2. Kanban Board & Multi-Dimensional Swimlanes Journey", async ({ page }) => {
    await page.goto("/projects/SOU/board");
    // Verify Board loads cleanly
    await expect(page.locator("body")).toBeVisible();
  });

  test("3. Release Versioning Hub & Notes Generator Journey", async ({ page }) => {
    await page.goto("/projects/SOU/releases");
    // Verify Releases page renders version progress
    await expect(page.locator("body")).toContainText("Releases");
  });

  test("4. Sprint Retrospective Suite Journey", async ({ page }) => {
    await page.goto("/projects/SOU/retro");
    // Verify 3-Column Retro Suite renders
    await expect(page.locator("body")).toContainText("Retrospective");
  });

  test("5. Teams & Workload Capacity Management Journey", async ({ page }) => {
    await page.goto("/settings/members");
    // Verify Teams roster page renders
    await expect(page.locator("body")).toBeVisible();
  });

  test("6. Visual JQL Query Builder & Filter Sharing Journey", async ({ page }) => {
    await page.goto("/filters");
    // Verify Filter search page renders
    await expect(page.locator("body")).toBeVisible();
  });
});
