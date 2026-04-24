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
  // Wait for DataTable toolbar to mount (proves React rendered the component tree)
  await expect(page.getByRole("button", { name: "Reset Table" })).toBeVisible({
    timeout: 15000,
  });
  // Wait for skeleton rows inside tbody to disappear.
  // Table header cells also carry bg-teal-700 so we scope to tbody only.
  await expect(page.locator("tbody .bg-teal-700")).toHaveCount(0, {
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

/**
 * Opens the ⋮ dropdown for a column header and clicks a named menu item.
 *
 * Uses force:true on both clicks:
 * - button click: bypasses tooltip span that can overlap the ⋮ button at the viewport edge.
 * - item click: skips scrollIntoViewIfNeeded, which Radix interprets as an outside click
 *   and closes the menu before the click lands.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} columnHeader - visible header text (e.g. "Airmass")
 * @param {string} itemName - menu item label (e.g. "Sort by asc.")
 */
export async function clickColumnMenuItem(page, columnHeader, itemName) {
  const th = page.locator("th").filter({ hasText: columnHeader }).first();
  await th.locator("button").click({ force: true });
  const item = page.getByRole("menuitem", { name: itemName });
  await item.waitFor({ state: "visible", timeout: 5000 });
  await item.click({ force: true });
}

/**
 * Opens the ⋮ dropdown for a column, selects filter values, and applies.
 *
 * Presses Escape after Apply because the Apply callback uses blur() which
 * is unreliable when the button is clicked via force:true.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} columnHeader - visible header text (e.g. "Science Program")
 * @param {string[]} values - filter values to check (e.g. ["SURVEY", "BLOCK"])
 */
export async function applyColumnFilter(page, columnHeader, values) {
  const th = page.locator("th").filter({ hasText: columnHeader }).first();
  await th.locator("button").click({ force: true });
  await expect(page.getByText("Filter:")).toBeVisible({ timeout: 5000 });
  for (const val of values) {
    const label = page.locator("label").filter({ hasText: val });
    await label.getByRole("checkbox").click({ force: true });
  }
  await page.getByRole("button", { name: "Apply" }).click({ force: true });
  await page.keyboard.press("Escape");
  await expect(page.getByText("Filter:")).toBeHidden({ timeout: 3000 });
}
