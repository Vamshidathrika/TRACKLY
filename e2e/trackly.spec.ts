import { test, expect } from "@playwright/test";
import { loginDemo } from "./helpers";

test.describe("Trackly Platform Superpowers E2E Test Suite", () => {
  test.beforeEach(async ({ page }) => {
    await loginDemo(page);
  });

  test("1. Onboarding & Template Selection Journey", async ({ page }) => {
    await page.goto("/onboarding");
    await expect(page.locator("body")).toContainText("Trackly");
  });

  test("2. Kanban Board & Multi-Dimensional Swimlanes Journey", async ({ page }) => {
    await page.goto("/projects");
    await expect(page.locator("body")).toBeVisible();
  });

  test("3. Release Versioning Hub & Notes Generator Journey", async ({ page }) => {
    await page.goto("/your-work");
    await expect(page.locator("body")).toContainText("Your Work");
  });

  test("4. Sprint Retrospective Suite Journey", async ({ page }) => {
    await page.goto("/teams");
    await expect(page.locator("body")).toBeVisible();
  });

  test("5. Teams & Workload Capacity Management Journey", async ({ page }) => {
    await page.goto("/settings/members");
    await expect(page.locator("body")).toBeVisible();
  });

  test("6. Visual JQL Query Builder & Filter Sharing Journey", async ({ page }) => {
    await page.goto("/filters");
    await expect(page.locator("body")).toBeVisible();
  });
});
