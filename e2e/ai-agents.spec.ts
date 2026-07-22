import { test, expect } from "@playwright/test";
import { loginDemo } from "./helpers";

test("Phase 9 Flow: AI Copilot Drawer Interaction", async ({ page }) => {
  // Login first
  await loginDemo(page);

  // 1. Visit Kanban Board (auth bypassed)
  await page.goto("/projects/DEMO/board");
  await expect(page.getByRole("heading", { name: "Demo Software Project" })).toBeVisible();

  // 2. Locate and click floating AI Copilot button
  const copilotBtn = page.getByRole("button", { name: "AI Copilot" });
  await expect(copilotBtn).toBeVisible();
  await copilotBtn.click();

  // 3. Verify AI Copilot Drawer header matches title
  await expect(page.getByText("Trackly AI Copilot")).toBeVisible();

  // 4. Test entering and submitting command input
  const input = page.getByPlaceholder("Ask AI to create, update, or transition status...");
  await expect(input).toBeVisible();
  await input.fill("create issue 'Automated task verification'");
  await page.keyboard.press("Enter");

  // 5. Verify user prompt bubble was added to chat feed
  await expect(page.getByText("create issue 'Automated task verification'")).toBeVisible();
});
