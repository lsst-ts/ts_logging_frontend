// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import { generateDataLogMock } from "../../helpers/mock-generators.js";
import { waitForPlotsLoad } from "../../helpers/plots-helpers.js";
import {
  PLOTS_URL,
  TEST_DAYOBS_INT,
  FULL_START,
  FULL_END,
  UTC_TO_TAI_MS,
} from "../../helpers/constants.js";

// Almanac events placed well within the observable night.
// UTC strings are converted internally via UTC + 37 s → TAI ms.
//
// Timeline:
//  night start │ twilight_evening │ moon_rise │ moon_set │ twilight_morning │ night end
//  12:00 UTC   │ 20:00 UTC        │ 22:00 UTC │ 02:00 UTC│ 04:00 UTC        │ 12:00 UTC
//
// TAI equivalents (UTC ms + UTC_TO_TAI_MS):
const TWILIGHT_EVENING_TAI =
  new Date("2026-01-01T20:00:00Z").getTime() + UTC_TO_TAI_MS; // 1767297637000
const TWILIGHT_MORNING_TAI =
  new Date("2026-01-02T04:00:00Z").getTime() + UTC_TO_TAI_MS; // 1767326437000
const MOON_RISE_TAI =
  new Date("2026-01-01T22:00:00Z").getTime() + UTC_TO_TAI_MS; // 1767304837000

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

// ---------------------------------------------------------------------------

test.describe("Twilight lines — full night range", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page, { "data-log": MOCK_DATA, almanac: ALMANAC_MOCK });
    await page.goto(PLOTS_URL);
    await waitForPlotsLoad(page);
  });

  test("each visible chart shows exactly two twilight lines", async ({
    page,
  }) => {
    const charts = page.locator("[data-slot='chart']");
    await expect(charts).toHaveCount(4);

    for (let i = 0; i < 4; i++) {
      await expect(
        charts.nth(i).locator(`line[stroke="${TWILIGHT_STROKE}"]`),
      ).toHaveCount(2);
    }
  });

  test("evening twilight line is positioned left of morning twilight line", async ({
    page,
  }) => {
    // Twilight values are emitted in almanac order: evening (index 0) then
    // morning (index 1), so the first line in the DOM is earlier.
    const firstChart = page.locator("[data-slot='chart']").first();
    const lines = firstChart.locator(`line[stroke="${TWILIGHT_STROKE}"]`);

    const eveningBox = await lines.nth(0).boundingBox();
    const morningBox = await lines.nth(1).boundingBox();

    expect(eveningBox.x).toBeLessThan(morningBox.x);
  });
});

// ---------------------------------------------------------------------------

test.describe("Twilight lines — zoom excludes both events", () => {
  test.beforeEach(async ({ page }) => {
    // Start window after the morning twilight so neither line is in range
    await setupApiMocks(page, { "data-log": MOCK_DATA, almanac: ALMANAC_MOCK });
    await page.goto(
      `${PLOTS_URL}&startTime=${
        TWILIGHT_MORNING_TAI + 60_000
      }&endTime=${FULL_END}`,
    );
    await waitForPlotsLoad(page);
  });

  test("twilight lines are absent when the zoom range excludes both events", async ({
    page,
  }) => {
    const firstChart = page.locator("[data-slot='chart']").first();
    await expect(
      firstChart.locator(`line[stroke="${TWILIGHT_STROKE}"]`),
    ).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------

test.describe("Moon areas — full night range", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page, { "data-log": MOCK_DATA, almanac: ALMANAC_MOCK });
    await page.goto(PLOTS_URL);
    await waitForPlotsLoad(page);
  });

  test("moon area appears on showMoon charts (Zero Points, Sky Brightness)", async ({
    page,
  }) => {
    const zeroPoint = page.locator(
      '[data-slot="chart"][title="Photometric Zero Points"]',
    );
    const skyBrightness = page.locator(
      '[data-slot="chart"][title="Sky Brightness"]',
    );

    await expect(zeroPoint.locator(`path[fill="${MOON_FILL}"]`)).toHaveCount(1);
    await expect(
      skyBrightness.locator(`path[fill="${MOON_FILL}"]`),
    ).toHaveCount(1);
  });

  test("moon area is absent on non-showMoon charts (Airmass, PSF)", async ({
    page,
  }) => {
    const airmass = page.locator('[data-slot="chart"][title="Airmass"]');
    const psf = page.locator('[data-slot="chart"][title="Seeing (PSF FWHM)"]');

    await expect(airmass.locator(`path[fill="${MOON_FILL}"]`)).toHaveCount(0);
    await expect(psf.locator(`path[fill="${MOON_FILL}"]`)).toHaveCount(0);
  });

  test("moon area is positioned between the evening and morning twilight lines", async ({
    page,
  }) => {
    // The mock has moon_rise at 22:00 UTC (2 h after evening twilight at 20:00)
    // and moon_set at 02:00 UTC (2 h before morning twilight at 04:00), so the
    // yellow area must sit strictly inside the two blue lines.
    const zeroPoint = page.locator(
      '[data-slot="chart"][title="Photometric Zero Points"]',
    );
    const lines = zeroPoint.locator(`line[stroke="${TWILIGHT_STROKE}"]`);
    const moonPath = zeroPoint.locator(`path[fill="${MOON_FILL}"]`);

    const eveningBox = await lines.nth(0).boundingBox();
    const morningBox = await lines.nth(1).boundingBox();
    const moonBox = await moonPath.boundingBox();

    // Moon area starts after the evening twilight line
    expect(moonBox.x).toBeGreaterThan(eveningBox.x);
    // Moon area ends before the morning twilight line
    expect(moonBox.x + moonBox.width).toBeLessThan(morningBox.x);
  });
});

// ---------------------------------------------------------------------------

test.describe("Moon areas — zoom ends before moon rise", () => {
  test.beforeEach(async ({ page }) => {
    // Window ends 1 minute before the moon rises; chartCalculations.js filters
    // out moon intervals that don't overlap with [selectedMin, selectedMax].
    await setupApiMocks(page, { "data-log": MOCK_DATA, almanac: ALMANAC_MOCK });
    await page.goto(
      `${PLOTS_URL}&startTime=${FULL_START}&endTime=${MOON_RISE_TAI - 60_000}`,
    );
    await waitForPlotsLoad(page);
  });

  test("moon area is absent when the zoom window ends before the moon rises", async ({
    page,
  }) => {
    const zeroPoint = page.locator(
      '[data-slot="chart"][title="Photometric Zero Points"]',
    );
    await expect(zeroPoint.locator(`path[fill="${MOON_FILL}"]`)).toHaveCount(0);
  });
});
