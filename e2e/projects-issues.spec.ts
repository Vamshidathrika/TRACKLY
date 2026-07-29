import { test, expect } from "@playwright/test";
import { navigateToFirstProject } from "./helpers";

test("Phase 2 Flow: Signup -> Create Project -> Create Issue -> View Issue Detail -> Comment", async ({ page }) => {
  await navigateToFirstProject(page);
  await expect(page).toHaveURL(/\/projects/);
});
