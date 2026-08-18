// @ts-check
import { waitForDataLogLoad } from "./datalog-helpers.js";
import { waitForContextFeedLoad } from "./contextfeed-helpers.js";
import {
  generateDataLogMock,
  generateDataLogMockMultiBand,
  generateContextFeedMock,
} from "./mock-generators.js";
import { DATALOG_URL, CONTEXTFEED_URL } from "./constants.js";

// Ten data-log records whose science_program alternates between a BLOCK that
// the lookup resolves and one it does not.
const DATALOG_BLOCK_ROWS = generateDataLogMock(10, {
  postProcess: (r, i) => ({
    ...r,
    science_program: i % 2 === 1 ? "BLOCK-320" : "BLOCK-999",
  }),
});
const DATALOG_BLOCK_URL = "https://rubinobs.atlassian.net/browse/BLOCK-320";
const DATALOG_BLOCK_LOOKUP = {
  data: {
    "BLOCK-320": { url: DATALOG_BLOCK_URL, summary: "Twilight survey" },
  },
  errors: null,
};

// The context-feed fixture names two BLOCKs; resolve only the first so the
// second exercises the unresolved path.
const CONTEXTFEED_BLOCK_URL =
  "https://rubinobs.atlassian.net/projects/BLOCK/BLOCK-T249";
const CONTEXTFEED_BLOCK_LOOKUP = {
  data: {
    "BLOCK-T249": {
      url: CONTEXTFEED_BLOCK_URL,
      summary: "Wide-fast-deep survey block",
      source: "zephyr",
    },
  },
  errors: null,
};

/**
 * Per-page descriptions of the DataTable, used by the specs in
 * tests/e2e/mocked/components/datatable/.
 *
 * Everything in those specs is behaviour of the DataTable component itself, so
 * it should hold on any page that mounts one. Each page only has to say which
 * of its columns to drive and what the fixture data makes that mean.
 *
 * Fields:
 *   mocks        API overrides giving the driven columns more than one value
 *   rowCount     rows the table shows with those mocks and the page defaults
 *   sort         the default-sorted column and the first/last row under it
 *   filter       a filterable column; urlParam is null for table-only filters
 *   group        a groupable column and the groups the fixture produces
 *   selection    the URL param and the values identifying the first two rows
 *   visibility   one default-visible and one default-hidden column
 *   resizeColumn a column whose size equals its minSize, so clamping is testable
 *   tooltip      a column with meta.tooltip, and text unique to that tooltip
 *   singleValue  a column with exactly one unique value under `mocks`
 */

/** @type {Array<Record<string, any>>} */
export const DATATABLE_PAGES = [
  {
    name: "data-log",
    url: DATALOG_URL,
    waitForLoad: waitForDataLogLoad,
    // 30 records cycling through y_10, g_10, r_10, i_10, z_10 — 6 each.
    mocks: { "data-log": generateDataLogMockMultiBand(30) },
    rowCount: 30,
    sort: {
      defaultColumn: "Exposure Id",
      defaultFirst: "20260101000001",
      defaultLast: "20260101000030",
      unsortedColumn: "Airmass",
    },
    filter: {
      column: "Filter",
      urlParam: "physical_filter",
      single: { value: "y_10", rows: 6 },
      multi: { values: ["y_10", "g_10"], rows: 12 },
      sortedValues: ["g_10", "i_10", "r_10", "y_10", "z_10"],
    },
    group: {
      column: "Filter",
      groupCount: 5,
      headerPattern: /Filter: y_10 \(6\)/,
    },
    selection: {
      urlParam: "selectedExposureId",
      clickColumn: "Exposure Id",
      firstRowValue: "20260101000001",
      firstRowText: "20260101000001",
      secondRowText: "20260101000002",
    },
    visibility: { visible: "Airmass", hiddenByDefault: "Seq Num" },
    resizeColumn: "Exposure Id",
    tooltip: {
      column: "Airmass",
      text: "Airmass of the observed line of sight",
    },
    // The default fixture is 30 records all on y_10.
    singleValue: { column: "Filter", mocks: {} },
    emptyMocks: { "data-log": { data_log: [] } },
    blocks: {
      mocks: {
        "data-log": DATALOG_BLOCK_ROWS,
        "block-details": DATALOG_BLOCK_LOOKUP,
      },
      partialMocks: {
        "data-log": DATALOG_BLOCK_ROWS,
        "block-details": { ...DATALOG_BLOCK_LOOKUP, errors: { jira: "boom" } },
      },
      rowCount: 10,
      summaryColumn: "BLOCK Description",
      linked: {
        value: "BLOCK-320",
        url: DATALOG_BLOCK_URL,
        summary: "Twilight survey",
        rowIndex: 0,
      },
      // Data Log has a dedicated BLOCK Description column, which stays empty
      // when the lookup has nothing for the row.
      unlinked: { value: "BLOCK-999", rowIndex: 1, summaryText: "" },
    },
  },
  {
    name: "context-feed",
    url: CONTEXTFEED_URL,
    waitForLoad: waitForContextFeedLoad,
    // The default context-feed fixture already spans several event types,
    // final statuses and tasks.
    mocks: {},
    rowCount: 10,
    sort: {
      defaultColumn: "Time (UTC)",
      defaultFirst: "2026-01-01 20:00:00.000",
      defaultLast: "2026-01-01 22:10:00.000",
      unsortedColumn: "Name",
    },
    filter: {
      // Final Status is a table-only filter — event_type is the URL-synced one
      // but it carries preserveEmptyFilter and a telescope default, so its
      // clear/uncheck semantics are page-specific and stay in the page spec.
      column: "Final Status",
      urlParam: null,
      single: { value: "Traceback", rows: 2 },
      multi: { values: ["Traceback", "Done"], rows: 4 },
      sortedValues: ["Done", "Task Change", "Traceback", "null"],
    },
    group: {
      column: "Final Status",
      groupCount: 4,
      headerPattern: /Final Status: Traceback \(2\)/,
    },
    selection: {
      urlParam: "selectedTime",
      clickColumn: "Name",
      // The time accessor returns microseconds since the epoch.
      firstRowValue: "1767297600000000",
      firstRowText: "BLOCK-T249",
      secondRowText: "MC_O_20260101_000001",
    },
    visibility: { visible: "Final Status", hiddenByDefault: "Current Task" },
    // First column, and its size equals its minSize. Later columns start
    // beyond the viewport, so their resize handles cannot be dragged.
    resizeColumn: "Event Type",
    tooltip: {
      column: "Event Type",
      text: "Data type displayed in the row",
    },
    // Every generated row is a Simonyi Exposure.
    singleValue: {
      column: "Event Type",
      mocks: { "context-feed": generateContextFeedMock(5) },
    },
    emptyMocks: { "context-feed": { data: [], cols: [] } },
    blocks: {
      mocks: { "block-details": CONTEXTFEED_BLOCK_LOOKUP },
      partialMocks: {
        "block-details": {
          ...CONTEXTFEED_BLOCK_LOOKUP,
          errors: { jira: "boom" },
        },
      },
      rowCount: 10,
      summaryColumn: "Description",
      linked: {
        value: "BLOCK-T249",
        url: CONTEXTFEED_BLOCK_URL,
        summary: "Wide-fast-deep survey block",
        rowIndex: 0,
      },
      // BLOCK-T250 is in the feed but not in the lookup above. The Context
      // Feed falls back to the raw description rather than blanking it.
      unlinked: {
        value: "BLOCK-T250",
        rowIndex: 5,
        summaryText: "Block T250 started",
      },
    },
  },
];

/** All rows currently rendered in the table body. */
export function tableRows(page) {
  return page.locator("[data-slot='table-body'] tr");
}

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * The header cell for a column, matched from the start of its text.
 *
 * A plain substring match is not enough here: the Context Feed has six columns
 * containing "Time (UTC)", so "Time (UTC)" would resolve to all of them.
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
 * Applies a multi-select column filter and dismisses the dropdown.
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
  // Match the menu item by role: the Context Feed toolbar also has a
  // "Group by Task" label, which a plain text match would collide with.
  await page.getByRole("menuitem", { name: "Group by", exact: true }).click();
}

/** Group header cells (the shaded full-width rows grouping adds). */
export function groupHeaderCells(page) {
  return page.locator("td.bg-stone-900");
}

/**
 * Returns the cell in body row `rowIndex` under the column with visible header
 * `headerName`.
 *
 * @param {import('@playwright/test').Page} page
 * @param {number} rowIndex - Zero-based body row index
 * @param {string} headerName
 */
export async function cellByHeader(page, rowIndex, headerName) {
  const headers = page.getByRole("columnheader");
  const texts = await headers.allInnerTexts();
  const index = texts.findIndex((text) => text.includes(headerName));
  if (index === -1) {
    throw new Error(`No column header matching "${headerName}"`);
  }
  return tableRows(page).nth(rowIndex).locator("td").nth(index);
}
