// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import { generateDataLogMock } from "../../helpers/mock-generators.js";
import { waitForPlotsLoad } from "../../helpers/plots-helpers.js";
import { waitForDataLogLoad } from "../../helpers/datalog-helpers.js";
import { waitForContextFeedLoad } from "../../helpers/contextfeed-helpers.js";
import {
  PLOTS_URL,
  DATALOG_URL,
  CONTEXTFEED_URL,
  TEST_DAYOBS_INT,
} from "../../helpers/constants.js";
import { TIMELINE_COLORS } from "../../../../src/constants/TIMELINE_DEFINITIONS.js";

const ALMANAC_MOCK = {
  almanac_info: [
    {
      dayobs: TEST_DAYOBS_INT,
      night_hours: 8,
      elapsed_twilight_hours: 8,
      twilight_evening_0deg: "2026-01-01 19:30:00",
      twilight_evening_12deg: "2026-01-01 20:00:00",
      twilight_morning_12deg: "2026-01-02 04:00:00",
      twilight_morning_0deg: "2026-01-02 04:30:00",
      moon_rise_time: "2026-01-01 22:00:00",
      moon_set_time: "2026-01-02 02:00:00",
      moon_illumination: "50%",
    },
  ],
};

const MOCK_DATA = generateDataLogMock(10, { dayobs: TEST_DAYOBS_INT });

// Timeline is rendered on canvas via ECharts (see TimelineChart.jsx), so
// twilight lines / moon areas have no per-mark DOM to query. Instead, read
// back the option the component built — twilight lines live on the
// "twilight-lines" series' markLine.data, moon-up intervals on the
// "moon-areas" series' markArea.data.
const TIMELINE_SELECTOR = '[data-slot="timeline"]';

async function getTimelineSeriesInfo(page) {
  return page.evaluate((selector) => {
    const inst = document.querySelector(selector).__echartsInstance;
    const option = inst.getOption();
    const twilightSeries = option.series.find((s) => s.id === "twilight-lines");
    const moonSeries = option.series.find((s) => s.id === "moon-areas");
    return {
      twilightLineCount: twilightSeries?.markLine?.data?.length ?? 0,
      twilightLineColor: twilightSeries?.markLine?.lineStyle?.color ?? null,
      moonAreaCount: moonSeries?.markArea?.data?.length ?? 0,
      moonAreaColor: moonSeries?.markArea?.itemStyle?.color ?? null,
    };
  }, TIMELINE_SELECTOR);
}

// `showsMoonArea` mirrors whether the page passes showMoonArea to
// TimelineChart. Context Feed deliberately does not.
const PAGES = [
  {
    name: "plots",
    url: PLOTS_URL,
    waitForLoad: waitForPlotsLoad,
    showsMoonArea: true,
  },
  {
    name: "data-log",
    url: DATALOG_URL,
    waitForLoad: waitForDataLogLoad,
    showsMoonArea: true,
  },
  {
    name: "context-feed",
    url: CONTEXTFEED_URL,
    waitForLoad: waitForContextFeedLoad,
    showsMoonArea: false,
  },
];

for (const { name, url, waitForLoad, showsMoonArea } of PAGES) {
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
      await expect(page.locator(TIMELINE_SELECTOR)).toBeVisible();
      const { twilightLineCount, twilightLineColor } =
        await getTimelineSeriesInfo(page);
      expect(twilightLineCount).toBe(2);
      expect(twilightLineColor).toBe(TIMELINE_COLORS.TWILIGHT_LINE);
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
      test.skip(!showsMoonArea, "page does not enable moon areas");

      await expect(page.locator(TIMELINE_SELECTOR)).toBeVisible();
      const { moonAreaCount, moonAreaColor } =
        await getTimelineSeriesInfo(page);
      expect(moonAreaCount).toBe(1);
      expect(moonAreaColor).toBe(TIMELINE_COLORS.MOON_AREA_FILL);
    });

    test("no moon area when the page does not enable them", async ({
      page,
    }) => {
      test.skip(showsMoonArea, "page enables moon areas");

      await expect(page.locator(TIMELINE_SELECTOR)).toBeVisible();
      const { moonAreaCount } = await getTimelineSeriesInfo(page);
      expect(moonAreaCount).toBe(0);
    });
  });
}
