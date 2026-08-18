// @ts-check
import { expect } from "@playwright/test";

/**
 * Row counts for the default context-feed fixture
 * (tests/e2e/mocks/fixtures/context-feed.json).
 *
 * The fixture holds 12 events. The page applies a telescope-specific default
 * event_type filter (see filterDefaultEventsByTelescope in ContextFeed.jsx),
 * so how many reach the table depends on the selected telescope.
 */
export const FIXTURE_TOTAL_ROWS = 12;
export const SIMONYI_ROWS = 10; // excludes the AT Queue + AuxTel Exposure rows
export const AUXTEL_ROWS = 5; // OCS Queue, AuxTel Exposure, AT Queue, Error (General), Narrative Log (General)

/** Rows whose finalStatus is "Traceback" (expandable description cells). */
export const SIMONYI_TRACEBACK_ROWS = 2;

/** Rows with an expandable YAML config cell, in the Simonyi view. */
export const SIMONYI_YAML_ROWS = 2;

/** Timeline series - one per CATEGORY_INDEX_INFO entry with a displayIndex. */
export const TIMELINE_SERIES_COUNT = 11;

/**
 * Waits for the Context Feed page to finish loading.
 *
 * tableLoading gates the timeline, the table and the status card, so once
 * every skeleton has gone the whole page is settled.
 *
 * @param {import('@playwright/test').Page} page
 */
export async function waitForContextFeedLoad(page) {
  await expect(page.locator("[data-slot='skeleton']")).toHaveCount(0, {
    timeout: 15000,
  });
  await expect(page.locator("[data-slot='table-body']")).toBeAttached();
}

/**
 * Returns the context-feed URL with optional params.
 *
 * @param {string} [dayobs="20260101"]
 * @param {string} [telescope="Simonyi"]
 * @param {string} [endDayobs=dayobs] - For multi-day ranges
 * @returns {string}
 */
export function getContextFeedUrl(
  dayobs = "20260101",
  telescope = "Simonyi",
  endDayobs = dayobs,
) {
  return `/nightlydigest/context-feed?startDayobs=${dayobs}&endDayobs=${endDayobs}&telescope=${telescope}`;
}

/** All rows currently rendered in the table body. */
export function tableRows(page) {
  return page.locator("[data-slot='table-body'] tr");
}

/**
 * Returns the cell in the given row under the given column header.
 *
 * @param {import('@playwright/test').Page} page
 * @param {number} rowIndex - Zero-based body row index
 * @param {string} headerName - Visible header text (e.g. "Description")
 */
export async function cellByHeader(page, rowIndex, headerName) {
  const headers = page.getByRole("columnheader");
  const count = await headers.count();
  for (let i = 0; i < count; i++) {
    const text = await headers.nth(i).textContent();
    if (text?.includes(headerName)) {
      return tableRows(page).nth(rowIndex).locator("td").nth(i);
    }
  }
  throw new Error(`No column header matching "${headerName}"`);
}

/**
 * Toggles one of the timeline's event-type checkboxes by its label.
 *
 * These drive the table's event_type column filter, so they are the
 * page's primary filtering control.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} label - e.g. "Simonyi Exposure"
 */
export async function toggleEventType(page, label) {
  // Exact-text matching rather than a regex - several labels contain
  // parentheses, e.g. "Error (Simonyi)".
  const row = page
    .locator("div.flex.items-center.space-x-2")
    .filter({ has: page.getByText(label, { exact: true }) });
  await row.getByRole("checkbox").click();
}

/**
 * Toggles one of the toolbar checkboxes above the table.
 *
 * @param {import('@playwright/test').Page} page
 * @param {"Group by Task"|"Collapse All Tracebacks"|"Collapse All YAML"} label
 */
export async function toggleToolbarCheckbox(page, label) {
  await page
    .locator("label")
    .filter({ hasText: label })
    .getByRole("checkbox")
    .click();
}

/**
 * Clears a column's multi-select filter via its header menu.
 *
 * The Clear/Apply buttons call e.stopPropagation(), so the Radix dropdown
 * does not auto-close - Escape dismisses it. Until it closes, the rest of
 * the page is aria-hidden and role queries match nothing.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} columnHeaderName
 */
export async function clearColumnFilter(page, columnHeaderName) {
  const header = page
    .getByRole("columnheader")
    .filter({ hasText: columnHeaderName });
  await header.locator("button").focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Clear" }).click();
  await page.keyboard.press("Escape");
}

/**
 * The toolbar's expand/collapse-groups button.
 *
 * Its label flips between "Expand All Groups" and "Collapse All Groups", and
 * reads "Collapse All Groups" while ungrouped because `[].every()` is true.
 *
 * @param {import('@playwright/test').Page} page
 */
export function groupToggleButton(page) {
  return page.getByRole("button", { name: /All Groups$/ });
}

/**
 * Reads the ECharts option back off a timeline container.
 *
 * The timelines render to canvas, so there is no per-mark DOM to assert on.
 * The component stashes its instance on the container element (see
 * useEChartsTimeline), which lets us inspect the option it actually built.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} selector - Container selector
 */
export function getEChartsOption(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el || !el.__echartsInstance) return null;
    const option = el.__echartsInstance.getOption();
    return {
      seriesIds: option.series.map((s) => s.id),
      scatterSeries: option.series
        .filter((s) => typeof s.id === "string" && s.id.startsWith("data-"))
        .map((s) => ({
          id: s.id,
          color: s.itemStyle?.color ?? null,
          opacity: s.itemStyle?.opacity ?? null,
          pointCount: s.data?.length ?? 0,
        })),
    };
  }, selector);
}

/**
 * Returns the [startMs, endMs] the chart's brush currently covers, or null if
 * nothing is brushed.
 *
 * The live brush lives on the brush component model, not on getOption() -
 * getOption().brush only carries the static config the component was built
 * with.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} selector - Container selector
 */
export function getBrushRange(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el || !el.__echartsInstance) return null;
    const brush = el.__echartsInstance.getModel().getComponent("brush");
    const area = brush?.areas?.[0];
    return area?.coordRange ?? null;
  }, selector);
}

export const TIMELINE_SELECTOR = "[data-slot='timeline']";
export const STATUS_TIMELINE_SELECTOR = "[data-slot='obs-status-timeline']";
