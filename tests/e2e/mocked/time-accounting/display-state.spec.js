// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import { generateExposureTimeAccountingMock } from "../../helpers/mock-generators.js";
import { TIME_ACCOUNTING_URL } from "../../helpers/constants.js";
import { tooltipForTrigger } from "../../helpers/digest-helpers.js";
import {
  exposureTimeAccountingCard,
  narrativeLogCard,
  waitForTimeAccountingLoad,
} from "../../helpers/time-accounting-helpers.js";

const ON_SKY_EXPOSURES = Array.from({ length: 16 }, (_, i) => ({
  day_obs: "20251231",
  can_see_sky: true,
  exp_time: 900,
  obs_start: new Date(Date.UTC(2026, 0, 1, 2, 0, i)).toISOString(),
}));

const READY_EXPOSURES = (overrides = {}) =>
  generateExposureTimeAccountingMock({
    exposures: ON_SKY_EXPOSURES,
    nightOnSkyAccounting: {
      sum_visit_gap_without_filter_change: 0.5,
      sum_overhead_without_filter_change: 0.5,
    },
    ...overrides,
  });

/**
 * Returns the first availability warning on `card` whose tooltip contains text.
 * Helpful when a card may show several warnings and we need a specific one.
 *
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} card
 * @param {string} text
 */
async function warningContaining(page, card, text) {
  const warnings = card.getByRole("button", {
    name: /data availability warning/,
  });
  const count = await warnings.count();
  for (let i = 0; i < count; i++) {
    const warning = warnings.nth(i);
    await warning.hover();
    const tooltip = await tooltipForTrigger(page, warning);
    if ((await tooltip.textContent()).includes(text)) return warning;
  }
  throw new Error(`No availability warning containing "${text}"`);
}

test.describe("Time Accounting — required-source no data", () => {
  test("shows an empty state on the exposure time accounting applet when exposures have no data", async ({
    page,
  }) => {
    await setupApiMocks(page, { exposures: { exposures: [] } });
    await page.goto(TIME_ACCOUNTING_URL);
    await waitForTimeAccountingLoad(page);

    await expect(
      exposureTimeAccountingCard(page).getByText(
        "No exposures found in ConsDB.",
      ),
    ).toBeVisible({ timeout: 15000 });
  });

  test("shows an empty state on the narrative log applet when narrative log has no data", async ({
    page,
  }) => {
    await setupApiMocks(page, { "narrative-log": { entries: [] } });
    await page.goto(TIME_ACCOUNTING_URL);
    await waitForTimeAccountingLoad(page);

    await expect(
      narrativeLogCard(page).getByText("No narrative log entries available."),
    ).toBeVisible({ timeout: 15000 });
  });
});

test.describe("Time Accounting — optional-source errors", () => {
  test("keeps the exposure time accounting chart when almanac has no data", async ({
    page,
  }) => {
    await setupApiMocks(page, {
      exposures: READY_EXPOSURES(),
      almanac: { almanac_info: [] },
    });
    await page.goto(TIME_ACCOUNTING_URL);
    await waitForTimeAccountingLoad(page);

    await expect(
      exposureTimeAccountingCard(page).getByTestId(
        "exposure-accounting-bar-Gaps",
      ),
    ).toBeVisible({ timeout: 15000 });
  });

  test("warns when dome data fails to fetch", async ({ page }) => {
    await setupApiMocks(page, {
      exposures: READY_EXPOSURES({ openDomeError: "boom" }),
    });
    await page.goto(TIME_ACCOUNTING_URL);
    await waitForTimeAccountingLoad(page);

    await expect(
      await warningContaining(
        page,
        exposureTimeAccountingCard(page),
        "Dome data could not be fetched.",
      ),
    ).toBeVisible();
  });

  test("warns when dome data is absent", async ({ page }) => {
    await setupApiMocks(page, { exposures: READY_EXPOSURES() });
    await page.goto(TIME_ACCOUNTING_URL);
    await waitForTimeAccountingLoad(page);

    await expect(
      await warningContaining(
        page,
        exposureTimeAccountingCard(page),
        "No dome data available.",
      ),
    ).toBeVisible();
  });

  test("warns when time accounting data fails to fetch", async ({ page }) => {
    await setupApiMocks(page, {
      exposures: READY_EXPOSURES({ timeAccountingError: "boom" }),
    });
    await page.goto(TIME_ACCOUNTING_URL);
    await waitForTimeAccountingLoad(page);

    await expect(
      await warningContaining(
        page,
        exposureTimeAccountingCard(page),
        "Exposure time accounting data could not be fetched.",
      ),
    ).toBeVisible();
  });

  test("warns when time accounting data is absent", async ({ page }) => {
    await setupApiMocks(page, {
      exposures: READY_EXPOSURES({ nightOnSkyAccounting: {} }),
    });
    await page.goto(TIME_ACCOUNTING_URL);
    await waitForTimeAccountingLoad(page);

    await expect(
      await warningContaining(
        page,
        exposureTimeAccountingCard(page),
        "No exposure time accounting data available.",
      ),
    ).toBeVisible();
  });
});
