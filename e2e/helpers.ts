export async function loginDemo(page: import("@playwright/test").Page) {
  if (page.url() === "about:blank" || !page.url().includes("localhost")) {
    await page.goto("/your-work");
  }
  if (page.url().includes("/login")) {
    await page.locator("#login-email").fill("demo@trackly.dev");
    await page.locator("#login-password").fill("password123");
    await page.getByRole("button", { name: /Sign In|Sign in/i }).click();
    await page.waitForURL(/\/your-work|\/projects/);
  }
}

export async function navigateToFirstProject(page: import("@playwright/test").Page) {
  await loginDemo(page);
  await page.goto("/projects");
  const projectLink = page.locator("table tbody tr td a").first();
  if (await projectLink.isVisible()) {
    await projectLink.click();
    await page.waitForURL(/\/projects/);
  }
}
