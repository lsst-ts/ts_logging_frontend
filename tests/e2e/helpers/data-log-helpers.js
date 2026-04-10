// @ts-check
import { expect } from "@playwright/test";
import { setupApiMocks } from "./mock-api.js";

/**
 * Waits for the Data Log page to finish loading.
 *
 * The sentinel is the disappearance of skeleton cells (class `bg-teal-700`),
 * which are rendered by DataTableBody while `isLoading` is true and removed
 * once both the data-log and exposure-entries fetches resolve.
 *
 * @param {import('@playwright/test').Page} page
 */
export async function waitForDataLogLoad(page) {
  await expect(page.locator(".bg-teal-700")).toHaveCount(0, {
    timeout: 15000,
  });
}

/**
 * Sets up Playwright route mocks for all backend API endpoints used by the
 * Data Log page. Extends `setupApiMocks` with a default empty exposure-entries
 * response so the page can load without errors in tests that only care about
 * the ConsDB data.
 *
 * The `overrides` parameter is merged on top of the defaults (including the
 * empty exposure-entries baseline), so you can supply a specific
 * `"exposure-entries"` value to test the merge path.
 *
 * @param {import('@playwright/test').Page} page
 * @param {Record<string, object | string>} [overrides]
 *
 * @example
 * // Default: empty exposure-entries, standard data-log fixture
 * await setupDataLogMocks(page);
 *
 * @example
 * // Override data-log with generated data, keep empty exposure-entries
 * await setupDataLogMocks(page, { "data-log": generateDataLogMock(10) });
 *
 * @example
 * // Test the merge path with a specific exposure-entries response
 * await setupDataLogMocks(page, {
 *   "exposure-entries": generateExposureEntriesMock(30, {
 *     overrides: { exposure_flag: "junk" },
 *   }),
 * });
 */
export async function setupDataLogMocks(page, overrides = {}) {
  await setupApiMocks(page, {
    "exposure-entries": { exposure_entries: [] },
    ...overrides,
  });
}
