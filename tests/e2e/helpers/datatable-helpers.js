// @ts-check
import { expect } from "@playwright/test";

/**
 * Helpers for driving the DataTable component, wherever it is mounted.
 *
 * Page-specific helpers live in datalog-helpers.js / contextfeed-helpers.js,
 * and the per-page descriptions the shared specs iterate over live in
 * datatable-pages.js. Anything that only knows about the table itself belongs
 * here, so there is one implementation of each interaction rather than one per
 * page.
 */

/** All rows currently rendered in the table body. */
export function tableRows(page) {
  return page.locator("[data-slot='table-body'] tr");
}

/** Group header cells - the shaded full-width rows that grouping adds. */
export function groupHeaderCells(page) {
  return page.locator("td.bg-stone-900");
}

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * The header cell for a column, matched from the start of its text.
 *
 * A plain substring match is not enough: the Context Feed has six columns
 * containing "Time (UTC)", and the Data Log has three starting "Exposure",
 * so an unanchored match resolves to several headers at once.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} name - Visible header text (e.g. "Time (UTC)")
 */
export function columnHeader(page, name) {
  return page
    .getByRole("columnheader")
    .filter({ hasText: new RegExp(`^\\s*${escapeRegExp(name)}`) });
}

/**
 * Opens a column's ⋮ menu.
 *
 * Opened from the keyboard: on narrow columns the ⋮ button can overflow under
 * the resize handle, which intercepts mouse clicks.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} name - Visible header text
 */
export async function openColumnMenu(page, name) {
  await columnHeader(page, name).locator("button").focus();
  await page.keyboard.press("Enter");
}

/**
 * Ticks values in a column's multi-select filter, applies it, and dismisses
 * the dropdown.
 *
 * Clear/Apply call e.stopPropagation(), so the Radix dropdown does not close
 * on its own; until it does, the rest of the page is aria-hidden.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} name - Visible header text
 * @param {string|string[]} values
 */
export async function applyColumnFilter(page, name, values) {
  await openColumnMenu(page, name);
  for (const value of Array.isArray(values) ? values : [values]) {
    await page.getByRole("checkbox", { name: value, exact: true }).click();
  }
  await page.getByRole("button", { name: "Apply" }).click();
  await page.keyboard.press("Escape");
}

/**
 * Clears a column's multi-select filter and dismisses the dropdown.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} name - Visible header text
 */
export async function clearColumnFilter(page, name) {
  await openColumnMenu(page, name);
  await page.getByRole("button", { name: "Clear" }).click();
  await page.keyboard.press("Escape");
}

/**
 * Groups the table by a column via its header menu.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} name - Visible header text
 */
export async function groupByColumn(page, name) {
  await openColumnMenu(page, name);
  // Match by role: the Context Feed toolbar also carries a "Group by Task"
  // label, which a plain text match would collide with.
  await page.getByRole("menuitem", { name: "Group by", exact: true }).click();
}

/**
 * Returns the cell under the column with visible header `headerName`.
 *
 * `row` may be a zero-based body row index or a row locator, so callers can
 * use whichever reads better at the call site.
 *
 * @param {import('@playwright/test').Page} page
 * @param {number|import('@playwright/test').Locator} row
 * @param {string} headerName
 * @returns {Promise<import('@playwright/test').Locator>}
 */
export async function cellByHeader(page, row, headerName) {
  // While a column dropdown is open (or still closing) the rest of the page is
  // aria-hidden and role queries match nothing - wait the header out before
  // reading the header row.
  await expect(columnHeader(page, headerName).first()).toBeVisible();

  const texts = await page.getByRole("columnheader").allInnerTexts();
  const index = texts.findIndex((text) => text.includes(headerName));
  if (index === -1) {
    throw new Error(`No column header matching "${headerName}"`);
  }

  const rowLocator = typeof row === "number" ? tableRows(page).nth(row) : row;
  return rowLocator.locator("td").nth(index);
}
