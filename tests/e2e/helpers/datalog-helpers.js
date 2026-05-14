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
 * @returns {string}
 */
export function getDataLogUrl(dayobs = "20260101", telescope = "Simonyi") {
  return `/nightlydigest/data-log?startDayobs=${dayobs}&endDayobs=${dayobs}&telescope=${telescope}`;
}

/**
 * Opens the column menu dropdown for a given column header.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} columnHeaderName - The visible header text (e.g., "Airmass")
 */
export async function openColumnMenu(page, columnHeaderName) {
  const header = page
    .getByRole("columnheader")
    .filter({ hasText: columnHeaderName });
  await header.locator("button").click();
}

/**
 * Applies a filter to a column.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} columnHeaderName
 * @param {string|string[]} values - Single value or array of values to filter by
 */
export async function applyFilter(page, columnHeaderName, values) {
  await openColumnMenu(page, columnHeaderName);
  const valueArray = Array.isArray(values) ? values : [values];
  for (const val of valueArray) {
    await page.getByRole("checkbox", { name: val }).click();
  }
  await page.getByRole("button", { name: "Apply" }).click();
  // The Apply button uses e.stopPropagation(), so the Radix dropdown doesn't
  // auto-close on click. Press Escape to ensure it's dismissed before continuing.
  await page.keyboard.press("Escape");
}

/**
 * Groups the table by a column.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} columnHeaderName
 */
export async function groupBy(page, columnHeaderName) {
  await openColumnMenu(page, columnHeaderName);
  await page.getByText(/Group by/).click();
}
