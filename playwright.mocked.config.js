import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for mocked e2e tests.
 * All backend API calls are intercepted via page.route() — no real network
 * traffic, no auth tokens required.
 *
 * Run with: npm run test:e2e
 *
 * Two projects, each with its own dev server:
 *
 * - `mocked` (tests/e2e/mocked) — the internal Nightly Digest.
 * - `snd` (tests/e2e/snd) — the Scientific Nightly Digest, whose server runs
 *   with VITE_SCIENTIFIC_NIGHTLY_DIGEST=true. The flag is resolved when the
 *   bundle is built, so the variant needs a server of its own; this project
 *   holds only what differs from the internal app, and expectations for the
 *   internal side stay in `mocked` so a change breaks whichever half it breaks.
 *
 * Narrow to one with `--project=snd`. Both servers start either way.
 *
 * The dev servers run on 5175/5176 rather than vite's default 5173 so the suite
 * never adopts the docker frontend container (or a dev server you have open)
 * as its target — those have their own node_modules and can silently make
 * every test fail. Override with E2E_PORT / E2E_SND_PORT if you need different
 * ports.
 */
const PORT = Number(process.env.E2E_PORT ?? 5175);
const SND_PORT = Number(process.env.E2E_SND_PORT ?? 5176);

export default defineConfig({
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { open: "never" }]],
  use: {
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "mocked",
      testDir: "./tests/e2e/mocked",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: `http://localhost:${PORT}`,
      },
    },
    {
      name: "snd",
      testDir: "./tests/e2e/snd",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: `http://localhost:${SND_PORT}`,
      },
    },
  ],
  webServer: [
    {
      command: `npm run dev -- --port ${PORT} --strictPort`,
      url: `http://localhost:${PORT}/nightlydigest/`,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `npm run dev -- --port ${SND_PORT} --strictPort`,
      url: `http://localhost:${SND_PORT}/nightlydigest/`,
      reuseExistingServer: !process.env.CI,
      env: { VITE_SCIENTIFIC_NIGHTLY_DIGEST: "true" },
    },
  ],
});
