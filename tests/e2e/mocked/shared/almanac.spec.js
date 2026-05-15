// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import { generateDataLogMock } from "../../helpers/mock-generators.js";
import { waitForPlotsLoad } from "../../helpers/plots-helpers.js";
import { waitForDataLogLoad } from "../../helpers/datalog-helpers.js";
import {
  PLOTS_URL,
  DATALOG_URL,
  TEST_DAYOBS_INT,
} from "../../helpers/constants.js";

const ALMANAC_MOCK = {
  almanac_info: [
    {
      dayobs: TEST_DAYOBS_INT,
      night_hours: 8,
      twilight_evening: "2026-01-01 20:00:00",
      twilight_morning: "2026-01-02 04:00:00",
      moon_rise_time: "2026-01-01 22:00:00",
      moon_set_time: "2026-01-02 02:00:00",
      moon_illumination: "50%",
    },
  ],
};

// Color constants (from PLOT_DEFINITIONS.js)
const TWILIGHT_STROKE = "#0ea5e9";
const MOON_FILL = "#EAB308";

const MOCK_DATA = generateDataLogMock(10, { dayobs: TEST_DAYOBS_INT });

// Selector for the timeline SVG: the recharts surface that is NOT inside a
// [data-slot="chart"] container (those belong to individual plots on the plots page).
const TIMELINE_SVG_SELECTOR =
  ':not([data-slot="chart"]) > .recharts-responsive-container svg.recharts-surface';

const PAGES = [
  { name: "plots", url: PLOTS_URL, waitForLoad: waitForPlotsLoad },
  { name: "data-log", url: DATALOG_URL, waitForLoad: waitForDataLogLoad },
];

for (const { name, url, waitForLoad } of PAGES) {
  // The timeline always renders the full night's almanac data regardless of
  // zoom selection (zoom only filters individual plot charts, not the timeline).

  // ---------------------------------------------------------------------------

  test.describe(`${name} — Twilight lines: full night range`, () => {
    test.beforeEach(async ({ page }) => {
      await setupApiMocks(page, {
        "data-log": MOCK_DATA,
        almanac: ALMANAC_MOCK,
      });
      await page.goto(url);
      await waitForLoad(page);
    });

    test("the timeline shows two twilight lines", async ({ page }) => {
      const timelineSvg = page.locator(TIMELINE_SVG_SELECTOR);
      await expect(
        timelineSvg.locator(`line[stroke="${TWILIGHT_STROKE}"]`),
      ).toHaveCount(2);
    });
  });

  // ---------------------------------------------------------------------------

  test.describe(`${name} — Moon areas: full night range`, () => {
    test.beforeEach(async ({ page }) => {
      await setupApiMocks(page, {
        "data-log": MOCK_DATA,
        almanac: ALMANAC_MOCK,
      });
      await page.goto(url);
      await waitForLoad(page);
    });

    test("moon area appears in the timeline when moon is up", async ({
      page,
    }) => {
      const timelineSvg = page.locator(TIMELINE_SVG_SELECTOR);
      await expect(
        timelineSvg.locator(`path[fill="${MOON_FILL}"]`),
      ).toHaveCount(1);
    });
  });
}
