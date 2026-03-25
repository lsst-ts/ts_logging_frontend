import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for mocked e2e tests.
 * All backend API calls are intercepted via page.route() — no real network
 * traffic, no auth tokens required.
 *
 * Run with: npm run test:e2e
 */
export default defineConfig({
  testDir: "./tests/e2e/mocked",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  timeout: 5_000,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173/nightlydigest/",
    reuseExistingServer: !process.env.CI,
  },
});
