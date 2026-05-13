// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import { generateDataLogMock } from "../../helpers/mock-generators.js";
import {
  waitForPlotsLoad,
  dragOn,
  getTimeParams,
} from "../../helpers/plots-helpers.js";
import { waitForDataLogLoad } from "../../helpers/datalog-helpers.js";
import {
  PLOTS_URL,
  DATALOG_URL,
  TEST_DAYOBS_INT,
  FULL_START,
  FULL_END,
  FULL_RANGE,
  UTC_TO_TAI_MS,
} from "../../helpers/constants.js";

// Mock record TAI timestamps.
// obs_start for record N (1-indexed) is UTC midnight of 2026-01-02 + (N-1) minutes.
// nightStart = 2026-01-02T00:00:00Z = 1767312000000 ms
function recTAI(n) {
  return 1767312000000 + (n - 1) * 60000 + UTC_TO_TAI_MS;
}

const ZOOM_MOCK_DATA = generateDataLogMock(10, {
  dayobs: TEST_DAYOBS_INT,
  postProcess: (r) => ({ ...r, airmass: 1.0 + r.seq_num * 0.15 }),
});

// Selector for the timeline SVG: the recharts surface that is NOT inside a
// [data-slot="chart"] container (those belong to individual plots on the plots page).
const TIMELINE_SVG_SELECTOR =
  ':not([data-slot="chart"]) > .recharts-responsive-container svg.recharts-surface';

const PAGES = [
  { name: "plots", url: PLOTS_URL, waitForLoad: waitForPlotsLoad },
  { name: "data-log", url: DATALOG_URL, waitForLoad: waitForDataLogLoad },
];

for (const { name, url, waitForLoad } of PAGES) {
  // ---------------------------------------------------------------------------

  test.describe(`${name} — Timeline: drag range selection`, () => {
    test.beforeEach(async ({ page }) => {
      await setupApiMocks(page, { "data-log": ZOOM_MOCK_DATA });
      await page.goto(url);
      await waitForLoad(page);
    });

    test("drag on timeline adds startTime and endTime to URL", async ({
      page,
    }) => {
      const timelineSvg = page.locator(TIMELINE_SVG_SELECTOR);
      await expect(timelineSvg).toBeVisible();

      await dragOn(page, timelineSvg, {
        fromX: 0.25,
        toX: 0.75,
        fromY: 0.5,
        toY: 0.5,
      });

      await expect(page).toHaveURL(/startTime=/);
      const { startTime, endTime } = getTimeParams(page);

      expect(startTime).not.toBeNull();
      expect(endTime).not.toBeNull();
      expect(startTime).toBeLessThan(endTime);
      expect(startTime).toBeGreaterThanOrEqual(FULL_START);
      expect(endTime).toBeLessThanOrEqual(FULL_END);
      expect(endTime - startTime).toBeLessThan(FULL_RANGE);
    });
  });

  // ---------------------------------------------------------------------------

  test.describe(`${name} — Timeline: double-click resets selection`, () => {
    test.beforeEach(async ({ page }) => {
      await setupApiMocks(page, { "data-log": ZOOM_MOCK_DATA });
      await page.goto(`${url}&startTime=${recTAI(2)}&endTime=${recTAI(8)}`);
      await waitForLoad(page);
    });

    test("double-click on timeline resets to the full time range", async ({
      page,
    }) => {
      const timelineSvg = page.locator(TIMELINE_SVG_SELECTOR);
      await expect(timelineSvg).toBeVisible();

      await timelineSvg.dblclick();

      await expect.poll(() => getTimeParams(page).startTime).toBe(FULL_START);
      await expect.poll(() => getTimeParams(page).endTime).toBe(FULL_END);
    });
  });

  // ---------------------------------------------------------------------------

  test.describe(`${name} — Timeline: shift-extend selection`, () => {
    const INIT_START = FULL_START + Math.round(0.3 * FULL_RANGE);
    const INIT_END = FULL_START + Math.round(0.6 * FULL_RANGE);

    test.beforeEach(async ({ page }) => {
      await setupApiMocks(page, { "data-log": ZOOM_MOCK_DATA });
      await page.goto(`${url}&startTime=${INIT_START}&endTime=${INIT_END}`);
      await waitForLoad(page);
    });

    test("shift-drag from outside the selection extends it from the farther edge", async ({
      page,
    }) => {
      const timelineSvg = page.locator(TIMELINE_SVG_SELECTOR);
      await expect(timelineSvg).toBeVisible();

      await dragOn(page, timelineSvg, {
        fromX: 0.8,
        toX: 0.9,
        fromY: 0.5,
        toY: 0.5,
        shiftKey: true,
      });

      await expect
        .poll(() => getTimeParams(page).endTime)
        .toBeGreaterThan(INIT_END);

      const { startTime } = getTimeParams(page);
      const TOLERANCE_MS = 5 * 60 * 1000;
      expect(startTime).toBeGreaterThanOrEqual(INIT_START - TOLERANCE_MS);
      expect(startTime).toBeLessThanOrEqual(INIT_START + TOLERANCE_MS);
    });
  });
}
