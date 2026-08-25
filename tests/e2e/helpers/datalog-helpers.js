// @ts-check
import { expect } from "@playwright/test";

/**
 * Waits for the Data-Log page to finish loading.
 * The loading skeletons disappear once data is loaded.
 *
 * @param {import('@playwright/test').Page} page
 */
export async function waitForDataLogLoad(page) {
  // Wait for all skeleton rows to disappear (signals tableLoading = false).
  // Avoid checking table-body visibility — it lives inside an overflow-auto
  // container which Playwright considers "hidden" even when content is present.
  await expect(page.locator("[data-slot='skeleton']")).toHaveCount(0, {
    timeout: 15000,
  });
  await expect(page.locator("[data-slot='table-body']")).toBeAttached();
}

/**
 * Returns the data-log URL with optional params.
 *
 * @param {string} [dayobs="20260101"]
 * @param {string} [telescope="Simonyi"]
 * @param {string} [endDayobs=dayobs] - For multi-day ranges
 * @returns {string}
 */
export function getDataLogUrl(
  dayobs = "20260101",
  telescope = "Simonyi",
  endDayobs = dayobs,
) {
  return `/nightlydigest/data-log?startDayobs=${dayobs}&endDayobs=${endDayobs}&telescope=${telescope}`;
}

// Generic table interactions live in datatable-helpers.js so there is one
// implementation per interaction. Re-exported here, with the names the
// data-log specs already use, so call sites stay unchanged.
export {
  openColumnMenu,
  clearColumnFilter,
  cellByHeader,
  applyColumnFilter as applyFilter,
  groupByColumn as groupBy,
} from "./datatable-helpers.js";
