// @ts-check
import { readFileSync } from "fs";
import { resolve } from "path";

const FIXTURES_DIR = resolve(import.meta.dirname, "../mocks/fixtures");

function loadFixture(name) {
  return JSON.parse(
    readFileSync(resolve(FIXTURES_DIR, `${name}.json`), "utf-8"),
  );
}

const DEFAULT_MOCKS = {
  "data-log": loadFixture("data-log"),
  "exposure-entries": loadFixture("exposure-entries"),
  almanac: loadFixture("almanac"),
  version: { version: "test" },
};

/**
 * Sets up Playwright route mocks for all backend API endpoints used by the
 * Plots page. Call this in beforeEach before navigating.
 *
 * Each key in the mocks object is matched against `** / nightlydigest / api / <key>*`.
 * Values may be a plain object (used directly as the JSON response) or a string
 * (name of a fixture file in tests/e2e/mocks/fixtures/, without .json extension).
 *
 * Any key not present in overrides falls back to the default. Keys present only
 * in overrides are also mocked.
 *
 * @param {import('@playwright/test').Page} page
 * @param {Record < string, object | string >} [overrides]
 *
 * @example
 * // Default fixtures
 * await setupApiMocks(page);
 *
 * @example
 * // Empty data-log for the "no data" toast test
 * await setupApiMocks(page, {"data-log": {data_log: [] } });
 *
 * @example
 * // Load a named fixture file
 * await setupApiMocks(page, {"data-log": "datalog-null-airmass" });
 *
 * @example
 * // Mock an additional endpoint variant
 * await setupApiMocks(page, {"data-log?telescope=AUXTEL": {data_log: [] } });
 */
export async function setupApiMocks(page, overrides = {}) {
  const mocks = { ...DEFAULT_MOCKS, ...overrides };

  for (const [key, value] of Object.entries(mocks)) {
    const data = typeof value === "string" ? loadFixture(value) : value;
    await page.route(`**/nightlydigest/api/${key}*`, (route) =>
      route.fulfill({ json: data }),
    );
  }
}
