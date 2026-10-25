// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import { DIGEST_URL } from "../../helpers/constants.js";
import {
  metricsCard,
  tooltipForTrigger,
} from "../../helpers/digest-helpers.js";

import { NO_DATA_DISPLAY } from "@/constants/DATA_SOURCES";
import { OBSERVATORY_STATE_AVAILABILITY_STATUS } from "@/constants/OBSERVATORY_STATUS_DEFINITIONS.js";

const EFFICIENCY_LABEL = "Open-shutter (-weather) efficiency";

const AVAILABLE_OBS_STATUS = (
  metrics = { fault_loss: 1.5, weather: 0.5, downtime: 0.25 },
) => ({
  entries: [],
  intervals: [],
  metrics,
  availability: {
    status: OBSERVATORY_STATE_AVAILABILITY_STATUS.FULL,
    available_from: null,
  },
  totals: metrics,
});

const ALMANAC_FOR_EFFICIENCY = {
  almanac_info: [
    {
      dayobs: 20260102,
      night_hours: 8,
      elapsed_twilight_hours: 8,
      twilight_evening_12deg: "2026-01-01 01:00:00",
      twilight_morning_12deg: "2026-01-01 09:00:00",
    },
  ],
};

const EXPOSURES_FOR_EFFICIENCY = {
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
};

function efficiencyCard(page) {
  return metricsCard(page, EFFICIENCY_LABEL);
}

function availabilityWarning(page) {
  return efficiencyCard(page).getByRole("button", {
    name: "Efficiency data availability warning",
  });
}

test.describe("Digest page — Efficiency card", () => {
  test("does not show an availability warning when data is fully available", async ({
    page,
  }) => {
    await setupApiMocks(page, { "obs-status": AVAILABLE_OBS_STATUS() });
    await page.goto(DIGEST_URL);

    await expect(availabilityWarning(page)).toHaveCount(0);
  });

  test("explains partially available Observatory Status data", async ({
    page,
  }) => {
    await setupApiMocks(page, {
      exposures: EXPOSURES_FOR_EFFICIENCY,
      "obs-status": {
        ...AVAILABLE_OBS_STATUS(),
        availability: {
          status: OBSERVATORY_STATE_AVAILABILITY_STATUS.PARTIAL,
          available_from: "20260225",
        },
      },
    });
    await page.goto(DIGEST_URL);

    const warning = availabilityWarning(page);
    await expect(warning).toHaveCount(1);
    await warning.hover();
    const tooltip = await tooltipForTrigger(page, warning);
    await expect(tooltip).toContainText(
      "Observatory Status data is only available from 2026-02-25.",
    );
  });

  test("explains when Observatory Status has no data", async ({ page }) => {
    await setupApiMocks(page, {
      exposures: EXPOSURES_FOR_EFFICIENCY,
      "obs-status": {
        entries: [],
        intervals: [],
        metrics: {},
        availability: {
          status: OBSERVATORY_STATE_AVAILABILITY_STATUS.NONE,
          available_from: null,
        },
        totals: {},
      },
    });
    await page.goto(DIGEST_URL);

    const warning = availabilityWarning(page);
    await expect(warning).toHaveCount(1);
    await warning.hover();
    const tooltip = await tooltipForTrigger(page, warning);
    await expect(tooltip).toContainText(
      "Observatory Status data is only available from the supported dayobs range.",
    );
  });

  test("uses zero weather loss when Observatory Status cannot be fetched", async ({
    page,
  }) => {
    await setupApiMocks(page, {
      almanac: ALMANAC_FOR_EFFICIENCY,
      exposures: EXPOSURES_FOR_EFFICIENCY,
    });
    await page.route("**/nightlydigest/api/obs-status*", (route) =>
      route.abort(),
    );
    await page.goto(DIGEST_URL);

    await expect(
      efficiencyCard(page).locator("[data-slot='metrics-card-value']"),
    ).toHaveText("13 %");
    const warning = availabilityWarning(page);
    await expect(warning).toHaveCount(1);
    await warning.hover();
    await expect(await tooltipForTrigger(page, warning)).toHaveText(
      "Observatory Status data could not be fetched.",
    );
  });

  test("explains the zero-weather fallback in its info popover", async ({
    page,
  }) => {
    await setupApiMocks(page);
    await page.goto(DIGEST_URL);

    await efficiencyCard(page).locator("button").click();
    await expect(
      page.getByText(
        "Where Observatory Status data is not available, weather loss is treated as",
      ),
    ).toBeVisible();
  });

  test("shows no-data placeholder when Almanac fails, even alongside partial Observatory Status", async ({
    page,
  }) => {
    await setupApiMocks(page, {
      exposures: EXPOSURES_FOR_EFFICIENCY,
      "obs-status": {
        ...AVAILABLE_OBS_STATUS(),
        availability: {
          status: OBSERVATORY_STATE_AVAILABILITY_STATUS.PARTIAL,
          available_from: "20260225",
        },
      },
    });
    await page.route("**/nightlydigest/api/almanac*", (route) => route.abort());
    await page.goto(DIGEST_URL);

    await expect(
      efficiencyCard(page).locator("[data-slot='metrics-card-value']"),
    ).toHaveText(`${NO_DATA_DISPLAY} %`);
    const warning = availabilityWarning(page);
    await expect(warning).toHaveCount(1);
    await warning.hover();
    const tooltip = await tooltipForTrigger(page, warning);
    await expect(tooltip).toContainText("Almanac data could not be fetched.");
  });

  test("shows no-data placeholder when Almanac data cannot be fetched", async ({
    page,
  }) => {
    await setupApiMocks(page, {
      exposures: EXPOSURES_FOR_EFFICIENCY,
      "obs-status": AVAILABLE_OBS_STATUS(),
    });
    await page.route("**/nightlydigest/api/almanac*", (route) => route.abort());
    await page.goto(DIGEST_URL);

    await expect(
      efficiencyCard(page).locator("[data-slot='metrics-card-value']"),
    ).toHaveText(`${NO_DATA_DISPLAY} %`);
    const warning = availabilityWarning(page);
    await expect(warning).toHaveCount(1);
    await warning.hover();
    await expect(await tooltipForTrigger(page, warning)).toHaveText(
      "Almanac data could not be fetched.",
    );
  });

  test("shows no-data placeholder and the Almanac error when Observatory Status also fails", async ({
    page,
  }) => {
    await setupApiMocks(page, {
      exposures: EXPOSURES_FOR_EFFICIENCY,
    });
    await page.route("**/nightlydigest/api/almanac*", (route) => route.abort());
    await page.route("**/nightlydigest/api/obs-status*", (route) =>
      route.abort(),
    );
    await page.goto(DIGEST_URL);

    const warning = availabilityWarning(page);
    await expect(warning).toHaveCount(1);
    await warning.hover();
    await expect(await tooltipForTrigger(page, warning)).toHaveText(
      "Almanac data could not be fetched.",
    );
  });
});
