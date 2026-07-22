import { test, expect } from "@playwright/test";
import { loginDemo } from "./helpers";

test("Phase 4 Flow: Notifications & Issue Watching", async ({ page }) => {
  // Login first
  await loginDemo(page);

  await page.goto("/projects/DEMO/issues/DEMO-3");
  await expect(page.getByText("DEMO-3")).toBeVisible();

  // 1. Toggle Watch button
  const watchBtn = page.getByRole("button", { name: /Watch/ });
  await expect(watchBtn).toBeVisible();
  await watchBtn.click();
  await expect(page.getByRole("button", { name: "Watching" })).toBeVisible();

  // 2. Post a comment with @mention
  await page.getByPlaceholder("Add a comment...").fill("Hey @Demo User please review this status update.");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Hey @Demo User please review this status update.")).toBeVisible();

  // 3. Verify Notification Bell is present on TopNav
  const bell = page.getByRole("button", { name: "Notifications" });
  await expect(bell).toBeVisible();
});
