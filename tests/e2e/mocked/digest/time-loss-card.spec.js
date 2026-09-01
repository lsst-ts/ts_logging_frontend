// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import { DIGEST_URL } from "../../helpers/constants.js";
import {
  timeLossCard,
  tooltipForTrigger,
} from "../../helpers/digest-helpers.js";

const AVAILABLE_OBS_STATUS = (
  metrics = { fault_loss: 1.5, weather: 0.5, downtime: 0.25 },
) => ({
  entries: [],
  intervals: [],
  metrics,
  availability: { status: "full", available_from: null },
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
        availability: { status: "partial", available_from: "20260225" },
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
    await expect(tooltip).toContainText(
      "Fault, Weather, and Downtime losses are treated as 0 where data is unavailable.",
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
        availability: { status: "none", available_from: null },
        totals: {},
      },
    });
    await page.goto(DIGEST_URL);

    const card = timeLossCard(page);
    await expect(card.locator("[data-slot='time-loss-fault']")).toHaveText(
      "NA",
    );
    await expect(card.locator("[data-slot='time-loss-weather']")).toHaveText(
      "NA",
    );
    await expect(card.locator("[data-slot='time-loss-downtime']")).toHaveText(
      "NA",
    );

    const warning = card.getByRole("button", {
      name: "Time Loss data availability warning",
    });
    await warning.hover();
    const tooltip = await tooltipForTrigger(page, warning);
    await expect(tooltip).toContainText(
      "Observatory Status data is only available from the supported dayobs range.",
    );
    await expect(tooltip).toContainText(
      "Fault, Weather, and Downtime losses are treated as 0 where data is unavailable.",
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
      "NA",
    );
    await expect(card.locator("[data-slot='time-loss-weather']")).toHaveText(
      "NA",
    );
    await expect(card.locator("[data-slot='time-loss-downtime']")).toHaveText(
      "NA",
    );
    const warning = card.getByRole("button", {
      name: "Time Loss data availability warning",
    });
    await warning.hover();
    await expect(await tooltipForTrigger(page, warning)).toContainText(
      "Observatory Status data could not be fetched.",
    );
  });

  test("combines Almanac and partial Observatory Status warnings", async ({
    page,
  }) => {
    await setupApiMocks(page, {
      "obs-status": {
        ...AVAILABLE_OBS_STATUS(),
        availability: { status: "partial", available_from: "20260225" },
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
      "Almanac data could not be fetched. Observatory Status data is only available from 2026-02-25.",
    );
    await expect(tooltip).toContainText(
      "Fault, Weather, and Downtime losses are treated as 0 where data is unavailable.",
    );
  });

  test("combines Almanac and Observatory Status fetch failures", async ({
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
      "Almanac and Observatory Status data could not be fetched.",
    );
  });
});
