import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for mocked e2e tests.
 * All backend API calls are intercepted via page.route() — no real network
 * traffic, no auth tokens required.
 *
 * Run with: npm run test:e2e
 *
 * The dev server runs on 5175 rather than vite's default 5173 so the suite
 * never adopts the docker frontend container (or a dev server you have open)
 * as its target — those have their own node_modules and can silently make
 * every test fail. Override with E2E_PORT if you need a different port.
 */
const PORT = Number(process.env.E2E_PORT ?? 5175);

export default defineConfig({
  testDir: "./tests/e2e/mocked",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/nightlydigest/`,
    reuseExistingServer: !process.env.CI,
  },
});
