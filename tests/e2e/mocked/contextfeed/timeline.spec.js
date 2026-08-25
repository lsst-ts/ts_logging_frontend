// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import { dragOn, getTimeParams } from "../../helpers/plots-helpers.js";
import {
  waitForContextFeedLoad,
  toggleEventType,
  getEChartsOption,
  getBrushRange,
  tableRows,
  TIMELINE_SELECTOR,
  STATUS_TIMELINE_SELECTOR,
  TIMELINE_SERIES_COUNT,
  SIMONYI_ROWS,
} from "../../helpers/contextfeed-helpers.js";
import {
  CONTEXTFEED_URL,
  FULL_START,
  FULL_END,
} from "../../helpers/constants.js";
import { TIMELINE_OPACITY } from "../../../../src/constants/TIMELINE_DEFINITIONS.js";
import { CATEGORY_INDEX_INFO } from "../../../../src/constants/CONTEXT_FEED_DEFINITIONS.js";

// Series are ordered by displayIndex ascending; index 0 is "Simonyi Exposure".
const SIMONYI_EXPOSURE_SERIES = "data-0";
const EXPECTED_POINT_COUNTS = [2, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1];

test.describe("Context Feed — timeline chart", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await page.goto(CONTEXTFEED_URL);
    await waitForContextFeedLoad(page);
    await expect(page.locator(TIMELINE_SELECTOR)).toBeVisible();
  });

  test("renders one scatter series per displayed event category", async ({
    page,
  }) => {
    const option = await getEChartsOption(page, TIMELINE_SELECTOR);
    expect(option.scatterSeries).toHaveLength(TIMELINE_SERIES_COUNT);
    expect(option.scatterSeries.map((s) => s.pointCount)).toEqual(
      EXPECTED_POINT_COUNTS,
    );
  });

  test("each series uses its category colour", async ({ page }) => {
    const expectedColors = Object.values(CATEGORY_INDEX_INFO)
      .filter((info) => info.displayIndex != null)
      .sort((a, b) => a.displayIndex - b.displayIndex)
      .map((info) => info.color);

    const option = await getEChartsOption(page, TIMELINE_SELECTOR);
    expect(option.scatterSeries.map((s) => s.color)).toEqual(expectedColors);
  });

  test("all default event types start active", async ({ page }) => {
    const option = await getEChartsOption(page, TIMELINE_SELECTOR);

    // AuxTel Exposure (index 1) and AT Queue (index 6) are excluded by the
    // Simonyi default filter, so they render dimmed.
    const simonyiExposure = option.scatterSeries[0];
    expect(simonyiExposure.opacity).toBe(TIMELINE_OPACITY.ACTIVE);
    expect(option.scatterSeries[1].opacity).toBe(TIMELINE_OPACITY.INACTIVE);
  });

  test("unchecking an event type dims its series", async ({ page }) => {
    await toggleEventType(page, "Simonyi Exposure");
    await expect(tableRows(page)).toHaveCount(SIMONYI_ROWS - 2);

    const option = await getEChartsOption(page, TIMELINE_SELECTOR);
    const series = option.scatterSeries.find(
      (s) => s.id === SIMONYI_EXPOSURE_SERIES,
    );
    expect(series.opacity).toBe(TIMELINE_OPACITY.INACTIVE);
    // The points stay on the chart — only their opacity changes.
    expect(series.pointCount).toBe(2);
  });

  test("re-checking an event type restores full opacity", async ({ page }) => {
    await toggleEventType(page, "Simonyi Exposure");
    await toggleEventType(page, "Simonyi Exposure");

    const option = await getEChartsOption(page, TIMELINE_SELECTOR);
    const series = option.scatterSeries.find(
      (s) => s.id === SIMONYI_EXPOSURE_SERIES,
    );
    expect(series.opacity).toBe(TIMELINE_OPACITY.ACTIVE);
  });
});

test.describe("Context Feed — brush sync between the two timelines", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await page.goto(CONTEXTFEED_URL);
    await waitForContextFeedLoad(page);
  });

  test("both timelines are rendered", async ({ page }) => {
    await expect(page.locator(TIMELINE_SELECTOR)).toBeVisible();
    await expect(page.locator(STATUS_TIMELINE_SELECTOR)).toBeVisible();
  });

  test("dragging the event timeline narrows the URL time range", async ({
    page,
  }) => {
    await dragOn(page, page.locator(TIMELINE_SELECTOR), {
      fromX: 0.3,
      toX: 0.7,
      fromY: 0.5,
      toY: 0.5,
    });

    await expect
      .poll(() => getTimeParams(page).startTime, { timeout: 5000 })
      .not.toBeNull();

    const { startTime, endTime } = getTimeParams(page);
    expect(startTime).toBeGreaterThan(FULL_START);
    expect(endTime).toBeLessThan(FULL_END);
  });

  test("dragging one timeline draws the same brush on the other", async ({
    page,
  }) => {
    // Both charts register in the "context-feed" brush group, so a brush on
    // one is mirrored onto the other (see useEChartsTimeline).
    expect(await getBrushRange(page, STATUS_TIMELINE_SELECTOR)).toBeNull();

    await dragOn(page, page.locator(TIMELINE_SELECTOR), {
      fromX: 0.3,
      toX: 0.7,
      fromY: 0.5,
      toY: 0.5,
    });

    await expect
      .poll(() => getBrushRange(page, STATUS_TIMELINE_SELECTOR), {
        timeout: 5000,
      })
      .not.toBeNull();

    // The mirrored brush covers exactly the same time span.
    expect(await getBrushRange(page, STATUS_TIMELINE_SELECTOR)).toEqual(
      await getBrushRange(page, TIMELINE_SELECTOR),
    );
  });

  test("dragging the status timeline mirrors onto the event timeline", async ({
    page,
  }) => {
    await dragOn(page, page.locator(STATUS_TIMELINE_SELECTOR), {
      fromX: 0.3,
      toX: 0.7,
      fromY: 0.5,
      toY: 0.5,
    });

    await expect
      .poll(() => getTimeParams(page).startTime, { timeout: 5000 })
      .not.toBeNull();

    await expect
      .poll(() => getBrushRange(page, TIMELINE_SELECTOR), { timeout: 5000 })
      .not.toBeNull();
    expect(await getBrushRange(page, TIMELINE_SELECTOR)).toEqual(
      await getBrushRange(page, STATUS_TIMELINE_SELECTOR),
    );
  });

  test("narrowing the range filters the table", async ({ page }) => {
    await expect(tableRows(page)).toHaveCount(SIMONYI_ROWS);

    // The fixture's events sit between 20:00 and 22:10 UTC inside a 24-hour
    // full range, so the brush has to be narrow to exclude any of them.
    await dragOn(page, page.locator(TIMELINE_SELECTOR), {
      fromX: 0.36,
      toX: 0.4,
      fromY: 0.5,
      toY: 0.5,
    });

    await expect
      .poll(() => getTimeParams(page).startTime, { timeout: 5000 })
      .not.toBeNull();

    // Some events fall outside the window, but not all of them.
    await expect
      .poll(() => tableRows(page).count(), { timeout: 5000 })
      .toBeLessThan(SIMONYI_ROWS);
    expect(await tableRows(page).count()).toBeGreaterThan(0);
  });
});

test.describe("Context Feed — timeline context menu", () => {
  test("right-clicking the timeline offers cross-page navigation", async ({
    page,
  }) => {
    await setupApiMocks(page);
    await page.goto(CONTEXTFEED_URL);
    await waitForContextFeedLoad(page);

    await page.locator(TIMELINE_SELECTOR).click({ button: "right" });

    const menu = page.getByRole("menu");
    await expect(menu.getByText("View Data Log")).toBeVisible();
    await expect(menu.getByText("View Plots")).toBeVisible();
  });

  test("the context menu preserves the search params", async ({ page }) => {
    await setupApiMocks(page);
    await page.goto(CONTEXTFEED_URL);
    await waitForContextFeedLoad(page);

    await page.locator(TIMELINE_SELECTOR).click({ button: "right" });
    await page.getByRole("menu").getByText("View Data Log").click();

    await expect(page).toHaveURL(/\/nightlydigest\/data-log/);
    expect(page.url()).toContain("startDayobs=20260101");
    expect(page.url()).toContain("telescope=Simonyi");
  });
});
