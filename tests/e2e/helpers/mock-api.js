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
  "context-feed": loadFixture("context-feed"),
  almanac: loadFixture("almanac"),
  exposures: loadFixture("exposures"),
  "expected-exposures": loadFixture("expected-exposures"),
  "narrative-log": loadFixture("narrative-log"),
  "obs-status": loadFixture("obs-status"),
  "night-reports": loadFixture("night-reports"),
  "exposure-flags": loadFixture("exposure-flags"),
  "jira-tickets": loadFixture("jira-tickets"),
  "static-visit-map": loadFixture("static-visit-map"),
  version: { version: "test" },
  // Exposure log: empty by default so no flags/comments but no error toast
  "exposure-entries": { exposure_entries: [] },
  // Block details: empty lookup so science_program renders as plain text
  "block-details": { data: {}, errors: null },
};

/**
 * Sets up Playwright route mocks for all backend API endpoints used.
 * Call this in beforeEach before navigating.
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

/**
 * Records requests to one API endpoint without changing how it responds.
 *
 * Routes registered later match first, so calling this after setupApiMocks
 * observes the request and then hands it back to the mock via fallback().
 * Use it to assert that a build variant does, or does not, hit an endpoint.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} endpoint - Endpoint name, e.g. "night-reports".
 * @returns {Promise<string[]>} Array that fills with matching request URLs.
 *
 * @example
 * const requests = await recordRequests(page, "jira-tickets");
 * await page.goto(DIGEST_URL);
 * expect(requests).toEqual([]);
 */
export async function recordRequests(page, endpoint) {
  const urls = [];
  await page.route(`**/nightlydigest/api/${endpoint}*`, (route) => {
    urls.push(route.request().url());
    return route.fallback();
  });
  return urls;
}
