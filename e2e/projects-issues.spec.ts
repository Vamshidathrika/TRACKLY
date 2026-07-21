import { test, expect } from "@playwright/test";

const email = `phase2-${Date.now()}@test.dev`;

test("Phase 2 Flow: Signup -> Create Project -> Create Issue -> View Issue Detail -> Comment", async ({ page }) => {
  // 1. Signup & setup site
  await page.goto("/signup");
  await page.getByPlaceholder("Full name").fill("Phase2 Tester");
  await page.getByPlaceholder("Work email").fill(email);
  await page.getByPlaceholder("Password (8+ characters)").fill("password123");
  await page.getByPlaceholder("Site name (e.g. your company)").fill("Phase2 Org");
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page).toHaveURL(/\/your-work/);

  // 2. Go to Projects and create a new project
  await page.goto("/projects");
  await page.getByRole("button", { name: "Create project" }).click();
  await page.getByPlaceholder("e.g. Mobile App").fill("Phase2 Core");
  await page.getByPlaceholder("e.g. MA").fill("P2C");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await expect(page.getByText("Phase2 Core")).toBeVisible();

  // 3. Open project page & create issue via top nav
  await page.click("text=Phase2 Core");
  await expect(page).toHaveURL(/\/projects\/P2C/);

  await page.getByRole("button", { name: "Create issue" }).click();
  await page.getByPlaceholder("What needs to be done?").fill("Implement Phase 2 Feature");
  await page.getByPlaceholder("Add more detail...").fill("Testing issue detail, inline edits, and comments.");
  await page.getByRole("button", { name: "Create", exact: true }).click();

  // 4. Verify issue in table and click into issue detail
  await expect(page.getByText("Implement Phase 2 Feature")).toBeVisible();
  await page.click("text=P2C-1");
  await expect(page).toHaveURL(/\/projects\/P2C\/issues\/P2C-1/);

  // 5. Add a comment on the issue
  await page.getByPlaceholder("Add a comment...").fill("This is an automated Playwright comment.");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("This is an automated Playwright comment.")).toBeVisible();
});
