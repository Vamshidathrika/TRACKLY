import { expect } from "@playwright/test";

export async function loginDemo(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "⚡ One-Click Demo Login" }).click();
  await expect(page).toHaveURL(/\/your-work/);
}
