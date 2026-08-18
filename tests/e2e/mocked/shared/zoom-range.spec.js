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
import { waitForContextFeedLoad } from "../../helpers/contextfeed-helpers.js";
import {
  PLOTS_URL,
  DATALOG_URL,
  CONTEXTFEED_URL,
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

// Selector for the timeline chart container (rendered on canvas via ECharts —
// see TimelineChart.jsx).
const TIMELINE_SELECTOR = '[data-slot="timeline"]';

const PAGES = [
  { name: "plots", url: PLOTS_URL, waitForLoad: waitForPlotsLoad },
  { name: "data-log", url: DATALOG_URL, waitForLoad: waitForDataLogLoad },
  {
    name: "context-feed",
    url: CONTEXTFEED_URL,
    waitForLoad: waitForContextFeedLoad,
  },
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
      const timelineChart = page.locator(TIMELINE_SELECTOR);
      await expect(timelineChart).toBeVisible();

      await dragOn(page, timelineChart, {
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
      const timelineChart = page.locator(TIMELINE_SELECTOR);
      await expect(timelineChart).toBeVisible();

      await timelineChart.dblclick();

      await expect.poll(() => getTimeParams(page).startTime).toBe(FULL_START);
      await expect.poll(() => getTimeParams(page).endTime).toBe(FULL_END);
    });
  });
}
