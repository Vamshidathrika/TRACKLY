import { defineConfig } from "@playwright/test";

// Port 3000 is frequently occupied by an unrelated app on dev machines, so the
// suite standardises on 3001. Override with PORT=... if 3001 is also taken.
const port = Number(process.env.PORT ?? 3001);
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  fullyParallel: false,
  use: { baseURL },
  webServer: {
    command: `PORT=${port} npm run start`,
    url: `${baseURL}/login`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
