// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import { DIGEST_URL } from "../../helpers/constants.js";
import {
  timeLossCard,
  tooltipForTrigger,
} from "../../helpers/digest-helpers.js";

import { NO_DATA_DISPLAY } from "@/constants/DATA_SOURCES";
import { OBSERVATORY_STATE_AVAILABILITY_STATUS } from "@/constants/OBSERVATORY_STATUS_DEFINITIONS.js";

const AVAILABLE_OBS_STATUS = (
  metrics = { fault_loss: 1.5, weather: 0.5, downtime: 0.25 },
) => ({
  entries: [],
  intervals: [
    {
      start_time_ms: 1767232800000,
      end_time_ms: 1767243600000,
      start_state: 2,
      end_state: 2,
    },
  ],
  metrics,
  availability: {
    status: OBSERVATORY_STATE_AVAILABILITY_STATUS.FULL,
    available_from: null,
  },
  totals: metrics,
});

test.describe("Digest page — Time Loss card", () => {
  test("shows Observatory Status losses when fully available", async ({
    page,
  }) => {
    await setupApiMocks(page, {
      "obs-status": AVAILABLE_OBS_STATUS(),
    });
    await page.goto(DIGEST_URL);

    const card = timeLossCard(page);
    await expect(card.getByText("Time Loss", { exact: true })).toBeVisible();
    await expect(card.locator("[data-slot='time-loss-fault']")).toHaveText(
      "1.50",
    );
    await expect(card.locator("[data-slot='time-loss-weather']")).toHaveText(
      "0.50",
    );
    await expect(card.locator("[data-slot='time-loss-downtime']")).toHaveText(
      "0.25",
    );
    await expect(
      card.getByRole("button", { name: "Time Loss data availability warning" }),
    ).toHaveCount(0);
  });

  test("shows Fault, Weather, and Downtime loading skeletons while Obs Status loads", async ({
    page,
  }) => {
    await setupApiMocks(page);
    // Registered after setupApiMocks so this pending route takes precedence.
    await page.route("**/nightlydigest/api/obs-status*", () => {});
    await page.goto(DIGEST_URL);

    const card = timeLossCard(page);
    await expect(
      card.locator("[data-slot='time-loss-fault-loading']"),
    ).toBeVisible();
    await expect(
      card.locator("[data-slot='time-loss-weather-loading']"),
    ).toBeVisible();
    await expect(
      card.locator("[data-slot='time-loss-downtime-loading']"),
    ).toBeVisible();
    await expect(card.locator("[data-slot='time-loss-fault']")).toHaveCount(0);
    await expect(card.locator("[data-slot='time-loss-weather']")).toHaveCount(
      0,
    );
    await expect(card.locator("[data-slot='time-loss-downtime']")).toHaveCount(
      0,
    );
  });

  test("explains partially available Observatory Status data", async ({
    page,
  }) => {
    await setupApiMocks(page, {
      "obs-status": {
        ...AVAILABLE_OBS_STATUS({
          fault_loss: 2.25,
          weather: 3.75,
          downtime: 0.5,
        }),
        availability: {
          status: OBSERVATORY_STATE_AVAILABILITY_STATUS.PARTIAL,
          available_from: "20260225",
        },
      },
    });
    await page.goto(DIGEST_URL);

    const card = timeLossCard(page);
    await expect(card.locator("[data-slot='time-loss-fault']")).toHaveText(
      "2.25",
    );
    await expect(card.locator("[data-slot='time-loss-weather']")).toHaveText(
      "3.75",
    );
    await expect(card.locator("[data-slot='time-loss-downtime']")).toHaveText(
      "0.50",
    );
    const warning = card.getByRole("button", {
      name: "Time Loss data availability warning",
    });
    await warning.hover();
    const tooltip = await tooltipForTrigger(page, warning);
    await expect(tooltip).toContainText(
      "Observatory Status data is only available from 2026-02-25.",
    );
  });

  test("shows unavailable values and a warning when Observatory Status has no data", async ({
    page,
  }) => {
    await setupApiMocks(page, {
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

    const card = timeLossCard(page);
    await expect(card.locator("[data-slot='time-loss-fault']")).toHaveText(
      NO_DATA_DISPLAY,
    );
    await expect(card.locator("[data-slot='time-loss-weather']")).toHaveText(
      NO_DATA_DISPLAY,
    );
    await expect(card.locator("[data-slot='time-loss-downtime']")).toHaveText(
      NO_DATA_DISPLAY,
    );

    const warning = card.getByRole("button", {
      name: "Time Loss data availability warning",
    });
    await warning.hover();
    const tooltip = await tooltipForTrigger(page, warning);
    await expect(tooltip).toContainText(
      "Observatory Status data is only available from the supported dayobs range.",
    );
  });

  test("uses zero weather loss when Observatory Status cannot be fetched", async ({
    page,
  }) => {
    await setupApiMocks(page);
    await page.route("**/nightlydigest/api/obs-status*", (route) =>
      route.abort(),
    );
    await page.goto(DIGEST_URL);

    const card = timeLossCard(page);
    await expect(card.locator("[data-slot='time-loss-fault']")).toHaveText(
      NO_DATA_DISPLAY,
    );
    await expect(card.locator("[data-slot='time-loss-weather']")).toHaveText(
      NO_DATA_DISPLAY,
    );
    await expect(card.locator("[data-slot='time-loss-downtime']")).toHaveText(
      NO_DATA_DISPLAY,
    );
    const warning = card.getByRole("button", {
      name: "Time Loss data availability warning",
    });
    await warning.hover();
    await expect(await tooltipForTrigger(page, warning)).toContainText(
      "Observatory Status data could not be fetched.",
    );
  });

  test("shows the partial-availability warning for Observatory Status", async ({
    page,
  }) => {
    await setupApiMocks(page, {
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

    const card = timeLossCard(page);
    const warning = card.getByRole("button", {
      name: "Time Loss data availability warning",
    });
    await expect(warning).toHaveCount(1);
    await warning.hover();
    const tooltip = await tooltipForTrigger(page, warning);
    await expect(tooltip).toContainText(
      "Observatory Status data is only available from 2026-02-25.",
    );
  });

  test("shows the Observatory Status error when it cannot be fetched", async ({
    page,
  }) => {
    await setupApiMocks(page);
    await page.route("**/nightlydigest/api/almanac*", (route) => route.abort());
    await page.route("**/nightlydigest/api/obs-status*", (route) =>
      route.abort(),
    );
    await page.goto(DIGEST_URL);

    const warning = timeLossCard(page).getByRole("button", {
      name: "Time Loss data availability warning",
    });
    await expect(warning).toHaveCount(1);
    await warning.hover();
    await expect(await tooltipForTrigger(page, warning)).toHaveText(
      "Observatory Status data could not be fetched.",
    );
  });
});
