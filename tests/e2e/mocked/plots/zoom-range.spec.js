// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import { generateDataLogMock } from "../../helpers/mock-generators.js";
import {
  waitForPlotsLoad,
  dragOn,
  getTimeParams,
} from "../../helpers/plots-helpers.js";
import {
  PLOTS_URL,
  TEST_DAYOBS_INT,
  FULL_START,
  FULL_END,
  FULL_RANGE,
  UTC_TO_TAI_MS,
} from "../../helpers/constants.js";

// Mock record TAI timestamps.
// obs_start for record N (1-indexed) is UTC midnight of 2026-01-02 + (N-1) minutes.
// nightStart = 2026-01-02T00:00:00Z = 1767312000000 ms
// obs_start_dt (TAI) = obs_start (UTC) + UTC_TO_TAI_MS
function recTAI(n) {
  return 1767312000000 + (n - 1) * 60000 + UTC_TO_TAI_MS;
}

// Shared mock data (spread-out airmass values so dots are well-separated)
const ZOOM_MOCK_DATA = generateDataLogMock(10, {
  dayobs: TEST_DAYOBS_INT,
  postProcess: (r) => ({ ...r, airmass: 1.0 + r.seq_num * 0.15 }),
});

// ---------------------------------------------------------------------------

test.describe("Individual plots — drag zoom in (X and Y)", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page, { "data-log": ZOOM_MOCK_DATA });
    await page.goto(PLOTS_URL);
    await waitForPlotsLoad(page);
    await expect(
      page
        .locator("[data-slot='chart']")
        .first()
        .locator("[data-obsid]")
        .first(),
    ).toBeAttached();
  });

  test("drag on a plot zooms the X axis and updates URL", async ({ page }) => {
    // The TimeseriesPlot uses 2D selection (enable2DSelection=true), so both
    // fractionX and fractionY must change for the callback to fire.  A
    // diagonal drag achieves this without requiring spread-out Y data.
    const firstChartSvg = page
      .locator("[data-slot='chart']")
      .first()
      .locator("svg.recharts-surface");

    await dragOn(page, firstChartSvg, {
      fromX: 0.2,
      toX: 0.8,
      fromY: 0.25,
      toY: 0.75,
    });

    await expect(page).toHaveURL(/startTime=/);
    const { startTime, endTime } = getTimeParams(page);
    expect(startTime).not.toBeNull();
    expect(endTime).not.toBeNull();
    expect(startTime).toBeLessThan(endTime);
    expect(endTime - startTime).toBeLessThan(FULL_RANGE);
  });

  test("drag without Shift also zooms the Y axis (reset button appears)", async ({
    page,
  }) => {
    const firstChart = page.locator("[data-slot='chart']").first();
    const resetButton = firstChart.locator('[aria-label="Reset Y-axis zoom"]');
    await expect(resetButton).not.toBeVisible();

    const firstChartSvg = firstChart.locator("svg.recharts-surface");

    await dragOn(page, firstChartSvg, {
      fromX: 0.2,
      toX: 0.8,
      fromY: 0.25,
      toY: 0.75,
    });

    // Without the Shift key, the Y fraction also updates → reset button
    await expect(resetButton).toBeVisible();
  });
});

// ---------------------------------------------------------------------------

test.describe("Individual plots — shift drag (X only, Y unchanged)", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page, { "data-log": ZOOM_MOCK_DATA });
    await page.goto(PLOTS_URL);
    await waitForPlotsLoad(page);
    await expect(
      page
        .locator("[data-slot='chart']")
        .first()
        .locator("[data-obsid]")
        .first(),
    ).toBeAttached();
  });

  test("shift-drag zooms X but leaves Y unchanged (no reset button)", async ({
    page,
  }) => {
    const firstChart = page.locator("[data-slot='chart']").first();
    const resetButton = firstChart.locator('[aria-label="Reset Y-axis zoom"]');
    await expect(resetButton).not.toBeVisible();

    const firstChartSvg = firstChart.locator("svg.recharts-surface");

    await dragOn(page, firstChartSvg, {
      fromX: 0.2,
      toX: 0.8,
      fromY: 0.25,
      toY: 0.75,
      shiftKey: true,
    });

    // X should have been zoomed (URL updated)
    await expect(page).toHaveURL(/startTime=/);

    // Y must NOT have been zoomed — the reset button must remain absent
    await expect(resetButton).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------

test.describe("Individual plots — ctrl drag zoom out", () => {
  // Start with a tight zoom covering only the first 5 records (4 minutes)
  const ZOOMED_START = recTAI(1); // 1767312037000
  const ZOOMED_END = recTAI(5); //   1767312277000
  const ZOOMED_RANGE = ZOOMED_END - ZOOMED_START; // 240 000 ms

  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page, { "data-log": ZOOM_MOCK_DATA });
    await page.goto(
      `${PLOTS_URL}&startTime=${ZOOMED_START}&endTime=${ZOOMED_END}`,
    );
    await waitForPlotsLoad(page);
    await expect(
      page
        .locator("[data-slot='chart']")
        .first()
        .locator("[data-obsid]")
        .first(),
    ).toBeAttached();
  });

  test("ctrl-drag expands the visible time range (zoom out)", async ({
    page,
  }) => {
    const firstChartSvg = page
      .locator("[data-slot='chart']")
      .first()
      .locator("svg.recharts-surface");

    await dragOn(page, firstChartSvg, {
      fromX: 0.2,
      toX: 0.8,
      fromY: 0.25,
      toY: 0.75,
      ctrlKey: true,
    });

    // Wait for the URL to reflect a wider range
    await expect
      .poll(
        () => {
          const { startTime, endTime } = getTimeParams(page);
          return endTime !== null && startTime !== null
            ? endTime - startTime
            : 0;
        },
        { timeout: 5000 },
      )
      .toBeGreaterThan(ZOOMED_RANGE);

    const { startTime, endTime } = getTimeParams(page);
    // Zoom-out must not exceed the full time range
    expect(startTime).toBeGreaterThanOrEqual(FULL_START);
    expect(endTime).toBeLessThanOrEqual(FULL_END);
  });
});

// ---------------------------------------------------------------------------

test.describe("Zoom — filtered data display", () => {
  test("navigating with startTime/endTime shows only observations within that range", async ({
    page,
  }) => {
    // Generate 10 records; set a URL that covers only records 1–5.
    //
    // The chart filter compares obs_start_dt (TAI DateTime, valueOf()=TAI ms)
    // against selectedMinMillis/selectedMaxMillis (URL values).
    // Setting endTime = recTAI(5) means:
    //   • record 5: TAI = recTAI(5) ≤ endTime  → included
    //   • record 6: TAI = recTAI(6) > endTime  → excluded
    const mockData = generateDataLogMock(10, { dayobs: TEST_DAYOBS_INT });
    await setupApiMocks(page, { "data-log": mockData });

    await page.goto(
      `${PLOTS_URL}&startTime=${FULL_START}&endTime=${recTAI(5)}`,
    );
    await waitForPlotsLoad(page);

    // The first chart (Airmass) should render exactly 5 dots
    const firstChart = page.locator("[data-slot='chart']").first();
    await expect(firstChart.locator("[data-obsid]").first()).toBeAttached();
    await expect(firstChart.locator("[data-obsid]")).toHaveCount(5);
  });
});
