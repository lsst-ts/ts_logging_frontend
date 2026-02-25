// @ts-check
import dataLogFixture from "../mocks/fixtures/data-log.js";
import almanacFixture from "../mocks/fixtures/almanac.js";

/**
 * Sets up Playwright route mocks for all backend API endpoints used by the
 * Plots page. Call this in beforeEach before navigating.
 *
 * @param {import('@playwright/test').Page} page
 * @param {object} [overrides]
 * @param {object} [overrides.dataLog]   - Replace the data-log response body
 * @param {object} [overrides.almanac]   - Replace the almanac response body
 *
 * @example
 * // Default fixtures
 * await setupApiMocks(page);
 *
 * @example
 * // Test the "no data" toast
 * await setupApiMocks(page, { dataLog: { data_log: [] } });
 */
export async function setupApiMocks(page, overrides = {}) {
  const dataLog = overrides.dataLog ?? dataLogFixture;
  const almanac = overrides.almanac ?? almanacFixture;

  await page.route("**/nightlydigest/api/data-log*", (route) =>
    route.fulfill({ json: dataLog }),
  );
  await page.route("**/nightlydigest/api/almanac*", (route) =>
    route.fulfill({ json: almanac }),
  );
  await page.route("**/nightlydigest/api/version*", (route) =>
    route.fulfill({ json: { version: "test" } }),
  );
}
