import { expect } from "@playwright/test";

export async function loginDemo(page: import("@playwright/test").Page) {
  await page.goto("/signup");
  const uniqueEmail = `demo-${Date.now()}-${Math.floor(Math.random() * 10000)}@trackly.dev`;
  await page.getByPlaceholder("Full name").fill("Demo User");
  await page.getByPlaceholder("Work email").fill(uniqueEmail);
  await page.getByPlaceholder("Password (8+ characters)").fill("password123");
  await page.getByPlaceholder("Site name (e.g. your company)").fill("Demo Workspace");
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page).toHaveURL(/\/your-work/);
}

