// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import { DIGEST_URL } from "../../helpers/constants.js";
import { metricsCard, timeLossCard } from "../../helpers/digest-helpers.js";

const AVAILABLE_OBS_STATUS = (metrics = { fault_loss: 1.5, weather: 0.5 }) => ({
  entries: [],
  intervals: [],
  metrics,
  availability: { status: "full", available_from: null },
  totals: metrics,
});

const ALMANAC_FOR_CALCULATED_FAULT = {
  almanac_info: [
    {
      dayobs: 20260102,
      night_hours: 8,
      elapsed_twilight_hours: 8,
      twilight_evening_0deg: "2026-01-01 00:30:00",
      twilight_evening_12deg: "2026-01-01 01:00:00",
      twilight_morning_12deg: "2026-01-01 09:00:00",
      twilight_morning_0deg: "2026-01-01 09:30:00",
      moon_rise_time: "2026-01-01 04:00:00",
      moon_set_time: "2025-12-31 16:00:00",
      moon_illumination: "50%",
    },
  ],
};

// Non-zero exposure and accounting data ensure the weather-loss fallback is
// exercised by both calculated values.
const EXPOSURES_FOR_ZERO_WEATHER_CALCULATIONS = {
  exposures: [
    {
      day_obs: "20260101",
      obs_start: "2026-01-01T02:00:00.000Z",
      exp_time: 3600,
      can_see_sky: true,
    },
  ],
  exposures_count: 1,
  sum_exposure_time: 3600,
  on_sky_exposures_count: 1,
  total_on_sky_exposure_time: 3600,
  open_dome_times: [],
  day_obs_open_dome_hours: {},
  open_dome_error: null,
  night_on_sky_time_accounting: {
    sum_overhead_without_filter_change: 0,
    sum_overhead_with_filter_change: 0.5,
  },
  time_accounting_error: null,
};

test.describe("Digest page — Time Loss and Efficiency cards", () => {
  test("shows Observatory Status and calculated fault loss when fully available", async ({
    page,
  }) => {
    await setupApiMocks(page, {
      almanac: ALMANAC_FOR_CALCULATED_FAULT,
      exposures: EXPOSURES_FOR_ZERO_WEATHER_CALCULATIONS,
      "obs-status": AVAILABLE_OBS_STATUS(),
    });
    await page.goto(DIGEST_URL);

    const card = timeLossCard(page);
    await expect(card.getByText("Time Loss", { exact: true })).toBeVisible();
    await expect(card.getByTestId("time-loss-fault")).toHaveText("1.50");
    await expect(card.getByTestId("time-loss-weather")).toHaveText("0.50");
    await expect(card.getByTestId("time-loss-calculated-fault")).toHaveText(
      "6.00",
    );
  });

  test("shows Fault, Weather and Calculated Fault loading skeletons while Obs Status loads", async ({
    page,
  }) => {
    await setupApiMocks(page);
    // Registered after setupApiMocks so this pending route takes precedence.
    await page.route("**/nightlydigest/api/obs-status*", () => {});
    await page.goto(DIGEST_URL);

    const card = timeLossCard(page);
    await expect(card.getByTestId("time-loss-fault-loading")).toBeVisible();
    await expect(card.getByTestId("time-loss-weather-loading")).toBeVisible();
    await expect(
      card.getByTestId("time-loss-calculated-fault-loading"),
    ).toBeVisible();
    await expect(card.getByTestId("time-loss-fault")).toHaveCount(0);
    await expect(card.getByTestId("time-loss-weather")).toHaveCount(0);
    await expect(card.getByTestId("time-loss-calculated-fault")).toHaveCount(0);
  });

  test("uses zero weather loss for calculated fault and efficiency when Obs Status is unavailable", async ({
    page,
  }) => {
    await setupApiMocks(page, {
      almanac: ALMANAC_FOR_CALCULATED_FAULT,
      exposures: EXPOSURES_FOR_ZERO_WEATHER_CALCULATIONS,
      "obs-status": {
        ...AVAILABLE_OBS_STATUS({}),
        availability: { status: "none", available_from: null },
      },
    });
    await page.goto(DIGEST_URL);

    const card = timeLossCard(page);
    await expect(card.getByTestId("time-loss-fault")).toHaveText("NA");
    await expect(card.getByTestId("time-loss-weather")).toHaveText("NA");
    const calculatedFault = card.getByTestId("time-loss-calculated-fault");
    const efficiency = metricsCard(
      page,
      "Open-shutter (-weather) efficiency",
    ).locator("[data-slot='metrics-card-value']");
    await expect(calculatedFault).toHaveText(/^-?\d+\.\d{2}$/);
    await expect(efficiency).toHaveText(/^\d+ %$/);
    const unavailableCalculatedFault = await calculatedFault.textContent();
    const unavailableEfficiency = await efficiency.textContent();

    await card
      .getByRole("button", { name: "Time Loss data availability warning" })
      .hover();
    const timeLossTooltip = openTooltip(page);
    await expect(timeLossTooltip).toContainText(
      "Observatory Status data is only available from the supported date range.",
    );
    await expect(timeLossTooltip).toContainText(
      "Weather loss is treated as 0.0 for dayobs without Observatory Status data.",
    );

    await page
      .getByRole("button", { name: "Efficiency data availability warning" })
      .hover();
    await expect(openTooltip(page)).toContainText(
      "Weather loss is treated as 0.0 for dayobs without Observatory Status data.",
    );

    // A fully available response with explicit zero weather loss must produce
    // the same values as the unavailable response, which falls back to zero.
    await page.route("**/nightlydigest/api/obs-status*", (route) =>
      route.fulfill({
        json: AVAILABLE_OBS_STATUS({ fault_loss: 0, weather: 0 }),
      }),
    );
    await page.goto(DIGEST_URL);

    await expect(
      timeLossCard(page).getByTestId("time-loss-calculated-fault"),
    ).toHaveText(unavailableCalculatedFault ?? "");
    await expect(
      metricsCard(page, "Open-shutter (-weather) efficiency").locator(
        "[data-slot='metrics-card-value']",
      ),
    ).toHaveText(unavailableEfficiency ?? "");
  });

  test("shows an accessible warning for unavailable calculated fault data", async ({
    page,
  }) => {
    await setupApiMocks(page, {
      almanac: ALMANAC_FOR_CALCULATED_FAULT,
      exposures: {
        ...EXPOSURES_FOR_ZERO_WEATHER_CALCULATIONS,
        time_accounting_error: "Time accounting data is unavailable.",
      },
      "obs-status": AVAILABLE_OBS_STATUS(),
    });
    await page.goto(DIGEST_URL);

    const warning = timeLossCard(page).getByRole("button", {
      name: "Calculated Fault unavailable",
    });
    await expect(warning).toBeVisible();
    await warning.hover();
    await expect(openTooltip(page)).toContainText(
      "Fault unavailable: no time accounting data.",
    );
  });

  test("keeps partial Obs Status values visible with a time-loss warning", async ({
    page,
  }) => {
    await setupApiMocks(page, {
      almanac: ALMANAC_FOR_CALCULATED_FAULT,
      exposures: EXPOSURES_FOR_ZERO_WEATHER_CALCULATIONS,
      "obs-status": {
        ...AVAILABLE_OBS_STATUS({ fault_loss: 2.25, weather: 3.75 }),
        availability: { status: "partial", available_from: "20260102" },
      },
    });
    await page.goto(DIGEST_URL);

    const card = timeLossCard(page);
    await expect(card.getByTestId("time-loss-fault")).toHaveText("2.25");
    await expect(card.getByTestId("time-loss-weather")).toHaveText("3.75");
    await expect(card.getByTestId("time-loss-calculated-fault")).toHaveText(
      "2.75",
    );

    await card
      .getByRole("button", { name: "Time Loss data availability warning" })
      .hover();
    const tooltip = openTooltip(page);
    await expect(tooltip).toContainText(
      "Observatory Status data is only available from 2026-01-02.",
    );
    await expect(tooltip).toContainText(
      "Time loss has been computed for the available dayobs.",
    );
    await expect(tooltip).not.toContainText("Fault time loss");
  });
});

/**
 * Radix keeps closed tooltip portals in the DOM, so role-only locators become
 * ambiguous after hovering more than one trigger. Select the open portal.
 *
 * @param {import('@playwright/test').Page} page
 */
function openTooltip(page) {
  return page.locator(
    "[data-slot='tooltip-content']:not([data-state='closed'])",
  );
}
