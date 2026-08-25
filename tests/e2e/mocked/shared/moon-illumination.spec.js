// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import { waitForPlotsLoad } from "../../helpers/plots-helpers.js";
import { waitForDataLogLoad } from "../../helpers/datalog-helpers.js";
import { waitForContextFeedLoad } from "../../helpers/contextfeed-helpers.js";
import {
  PLOTS_URL,
  DATALOG_URL,
  CONTEXTFEED_URL,
} from "../../helpers/constants.js";
import { TIMELINE_COLORS } from "../../../../src/constants/TIMELINE_DEFINITIONS.js";

// Moon illumination labels are ECharts *graphic* elements rather than series,
// so shared/almanac.spec.js (which reads series markLine/markArea) does not
// reach them. They render one per Chile midnight inside the visible range.
const TIMELINE_SELECTOR = "[data-slot='timeline']";

function almanacDay(dayobs, illumination) {
  const d = String(dayobs);
  const iso = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  const next = new Date(`${iso}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  const nextIso = next.toISOString().slice(0, 10);
  return {
    dayobs,
    night_hours: 8,
    elapsed_twilight_hours: 8,
    twilight_evening_0deg: `${iso} 23:30:00`,
    twilight_evening_12deg: `${nextIso} 00:00:00`,
    twilight_morning_12deg: `${nextIso} 08:00:00`,
    twilight_morning_0deg: `${nextIso} 08:30:00`,
    moon_rise_time: `${iso} 22:00:00`,
    moon_set_time: `${nextIso} 02:00:00`,
    moon_illumination: illumination,
  };
}

// The almanac reports each night under the *following* dayobs
// (see almanacDayobsForPlot), so the label shown for the 20260101 night comes
// from the 20260102 entry.
const ALMANAC_WITH_ILLUMINATION = {
  almanac_info: [almanacDay(20260101, "50%"), almanacDay(20260102, "37%")],
};

const ALMANAC_WITHOUT_MATCHING_NIGHT = {
  almanac_info: [almanacDay(20260101, "50%")],
};

/**
 * Walks the timeline's graphic elements and reports the text labels and moon
 * symbol circles it drew.
 */
function getTimelineGraphicInfo(page) {
  return page.evaluate((selector) => {
    const el = document.querySelector(selector);
    if (!el || !el.__echartsInstance) return null;

    const texts = [];
    const circleFills = [];
    const walk = (elements) =>
      (elements || []).forEach((element) => {
        if (element.style && typeof element.style.text === "string") {
          texts.push(element.style.text);
        }
        if (element.type === "circle") {
          circleFills.push(element.style?.fill ?? null);
        }
        if (element.children) walk(element.children);
      });

    (el.__echartsInstance.getOption().graphic || []).forEach((entry) =>
      walk(entry.elements || [entry]),
    );

    return { texts, circleFills };
  }, TIMELINE_SELECTOR);
}

const PAGES = [
  { name: "plots", url: PLOTS_URL, waitForLoad: waitForPlotsLoad },
  { name: "data-log", url: DATALOG_URL, waitForLoad: waitForDataLogLoad },
];

for (const { name, url, waitForLoad } of PAGES) {
  test.describe(`${name} — Timeline: moon illumination labels`, () => {
    test("the illumination label for the night is drawn", async ({ page }) => {
      await setupApiMocks(page, { almanac: ALMANAC_WITH_ILLUMINATION });
      await page.goto(url);
      await waitForLoad(page);

      const info = await getTimelineGraphicInfo(page);
      expect(info.texts).toContain("37%");
      // Only one Chile midnight falls inside a single night's range.
      expect(info.texts.filter((t) => t.endsWith("%"))).toHaveLength(1);
    });

    test("the label is accompanied by the two moon symbol circles", async ({
      page,
    }) => {
      await setupApiMocks(page, { almanac: ALMANAC_WITH_ILLUMINATION });
      await page.goto(url);
      await waitForLoad(page);

      const info = await getTimelineGraphicInfo(page);
      expect(info.circleFills).toContain(TIMELINE_COLORS.MOON_SYMBOL_LIGHT);
      expect(info.circleFills).toContain(TIMELINE_COLORS.MOON_SYMBOL_DARK);
    });

    test("no label when the almanac has no entry for that night", async ({
      page,
    }) => {
      await setupApiMocks(page, {
        almanac: ALMANAC_WITHOUT_MATCHING_NIGHT,
      });
      await page.goto(url);
      await waitForLoad(page);

      const info = await getTimelineGraphicInfo(page);
      expect(info.texts.filter((t) => t.endsWith("%"))).toHaveLength(0);
    });
  });
}

test.describe("context-feed — Timeline: moon illumination is not shown", () => {
  test("the context feed timeline draws no illumination labels", async ({
    page,
  }) => {
    // ContextFeed renders TimelineChart without showMoonIllumination.
    await setupApiMocks(page, { almanac: ALMANAC_WITH_ILLUMINATION });
    await page.goto(CONTEXTFEED_URL);
    await waitForContextFeedLoad(page);

    const info = await getTimelineGraphicInfo(page);
    expect(info.texts.filter((t) => t.endsWith("%"))).toHaveLength(0);
  });
});
