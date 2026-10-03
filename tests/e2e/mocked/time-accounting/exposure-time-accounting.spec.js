// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import { generateExposureTimeAccountingMock } from "../../helpers/mock-generators.js";
import { TIME_ACCOUNTING_URL } from "../../helpers/constants.js";
import { tooltipForTrigger } from "../../helpers/digest-helpers.js";
import {
  exposureTimeAccountingCard,
  openExposureTimeAccountingInfo,
  waitForTimeAccountingLoad,
} from "../../helpers/time-accounting-helpers.js";

// On-sky time-accounting data so the applet has enough to render a real chart.
// total_on_sky_exposure_time = 14400s (4 h) against the 8 h of elapsed
// twilight in the almanac fixture yields 50 % / 50 % for Exposures vs
// Not-exposures, and the breakdown hours make the calculated fault positive.
const TIME_ACCOUNTING_EXPOSURES = (overrides = {}) =>
  generateExposureTimeAccountingMock({
    totalOnSkySeconds: 14400,
    nightOnSkyAccounting: {
      sum_visit_gap_without_filter_change: 0.5,
      sum_overhead_without_filter_change: 0.5,
      sum_visit_gap_with_filter_change: 0.25,
      sum_overhead_with_filter_change: 0.25,
    },
    dayObsOpenDomeHours: {
      20260101: { night_hours: 8, open_hours: 6, closed_hours: 2 },
    },
    ...overrides,
  });

// The chart's bars are rendered as recharts rectangles once the data has
// loaded; its presence is the load sentinel for the applet.
const expectChartRendered = async (page) => {
  await expect(
    exposureTimeAccountingCard(page).locator(".recharts-bar-rectangle").first(),
  ).toBeVisible({ timeout: 15000 });
};

test.describe("Exposure Time Accounting — populated data", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page, { exposures: TIME_ACCOUNTING_EXPOSURES() });
    await page.goto(TIME_ACCOUNTING_URL);
    await waitForTimeAccountingLoad(page);
  });

  test("renders the exposure percentage split and the bar chart", async ({
    page,
  }) => {
    const card = exposureTimeAccountingCard(page);
    await expectChartRendered(page);

    await expect(card.getByText("Exposures", { exact: true })).toBeVisible();
    await expect(card.getByText("Not exposures")).toBeVisible();
    // 4 h exposing out of 8 h observable time -> 50 % / 50 %.
    await expect(card.getByText("50 %")).toHaveCount(2);
    await expect(card.getByText("Observable time")).toBeVisible();
    await expect(card.getByText("Time not exposing")).toBeVisible();
  });

  test("hides and shows the graph with the toggle", async ({ page }) => {
    const card = exposureTimeAccountingCard(page);
    await expectChartRendered(page);

    await card.getByRole("button", { name: "Hide Graph" }).click();
    await expect(card.locator(".recharts-bar-rectangle")).toHaveCount(0);

    await card.getByRole("button", { name: "Show Graph" }).click();
    await expect(card.locator(".recharts-bar-rectangle").first()).toBeVisible();
  });

  test("opens the info popover explaining the breakdown", async ({ page }) => {
    await expectChartRendered(page);

    await openExposureTimeAccountingInfo(page);
    await expect(
      page.getByText(
        "Breakdown of observable time during selected dayobs range.",
      ),
    ).toBeVisible();
    await expect(page.getByText("Calculated Fault:").first()).toBeVisible();
  });

  test("opens the download placeholder popover", async ({ page }) => {
    const card = exposureTimeAccountingCard(page);
    await expectChartRendered(page);

    await card.locator("[data-slot='card-header'] button").nth(0).click();
    await expect(
      page.getByText("This is a placeholder for the download/export button."),
    ).toBeVisible();
  });
});

test.describe("Exposure Time Accounting — availability warnings", () => {
  test("warns when observatory status is only partially available", async ({
    page,
  }) => {
    await setupApiMocks(page, {
      exposures: TIME_ACCOUNTING_EXPOSURES(),
      "obs-status": {
        entries: [],
        intervals: [
          {
            start_time_ms: 1767232800000,
            end_time_ms: 1767243600000,
            start_state: 2,
            end_state: 2,
            start_note: null,
            end_note: null,
            start_labels: "OPERATIONAL",
            end_labels: "OPERATIONAL",
          },
        ],
        metrics: { weather: 0.5 },
        availability: { status: "partial", available_from: "20260102" },
        totals: {},
      },
    });
    await page.goto(TIME_ACCOUNTING_URL);

    const card = exposureTimeAccountingCard(page);
    const warning = card.getByRole("button", {
      name: "Exposure Time Accounting data availability warning",
    });
    await expect(warning).toBeVisible({ timeout: 15000 });
    await warning.hover();
    await expect(await tooltipForTrigger(page, warning)).toContainText(
      "Observatory Status data is only available from",
    );
  });

  test("warns when dome data is unavailable", async ({ page }) => {
    await setupApiMocks(page, {
      exposures: TIME_ACCOUNTING_EXPOSURES({ openDomeError: "dome boom" }),
    });
    await page.goto(TIME_ACCOUNTING_URL);
    await waitForTimeAccountingLoad(page);

    const card = exposureTimeAccountingCard(page);
    const warning = card.getByRole("button", {
      name: "Exposure Time Accounting data availability warning",
    });
    await expect(warning).toBeVisible();
    await warning.hover();
    await expect(await tooltipForTrigger(page, warning)).toContainText(
      "Dome data unavailable.",
    );
  });

  test("reports fault data as unavailable when time accounting is missing", async ({
    page,
  }) => {
    await setupApiMocks(page, {
      exposures: generateExposureTimeAccountingMock({
        totalOnSkySeconds: 14400,
        nightOnSkyAccounting: {},
        timeAccountingError: "time accounting boom",
      }),
    });
    await page.goto(TIME_ACCOUNTING_URL);
    await waitForTimeAccountingLoad(page);

    const card = exposureTimeAccountingCard(page);
    // The chart is replaced by the time-accounting fetch error.
    await expect(
      card.getByText("Exposure time accounting data could not be fetched."),
    ).toBeVisible({ timeout: 15000 });

    // And the header warns that fault can't be computed.
    const warning = card.getByRole("button", {
      name: "Exposure Time Accounting data availability warning",
    });
    await expect(warning).toBeVisible();
    await warning.hover();
    await expect(await tooltipForTrigger(page, warning)).toContainText(
      "Fault data unable to be computed: no exposure time accounting data.",
    );
  });
});

test.describe("Exposure Time Accounting — fetch failure", () => {
  test("shows a fetch-error message instead of the chart", async ({ page }) => {
    await setupApiMocks(page);
    // Registered after setupApiMocks so this failed route takes precedence.
    await page.route("**/nightlydigest/api/exposures*", (route) =>
      route.abort(),
    );
    await page.goto(TIME_ACCOUNTING_URL);
    await waitForTimeAccountingLoad(page);

    const card = exposureTimeAccountingCard(page);
    await expect(
      card.getByText("Exposure data could not be fetched."),
    ).toBeVisible({ timeout: 15000 });
    await expect(card.locator(".recharts-bar-rectangle")).toHaveCount(0);
  });
});
