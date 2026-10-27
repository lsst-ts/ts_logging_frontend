// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import { generateExposureTimeAccountingMock } from "../../helpers/mock-generators.js";
import { TIME_ACCOUNTING_URL } from "../../helpers/constants.js";
import { exposureTimeAccountingCard } from "../../helpers/time-accounting-helpers.js";

const readyExposures = (overrides = {}) =>
  generateExposureTimeAccountingMock({
    exposures: [
      {
        day_obs: "20251231",
        can_see_sky: true,
        exp_time: 14400,
        obs_start: "2026-01-01T02:00:00Z",
      },
    ],
    nightOnSkyAccounting: {
      sum_visit_gap_without_filter_change: 0.5,
      sum_overhead_without_filter_change: 0.5,
      sum_visit_gap_with_filter_change: 0.25,
      sum_overhead_with_filter_change: 0.25,
    },
    dayObsOpenDomeHours: {
      20251231: { night_hours: 8, open_hours: 6, closed_hours: 2 },
    },
    ...overrides,
  });

// Hover category ticks to reach zero-height bars.
async function hoverCategory(page, card, name) {
  const chart = card.getByTestId("exposure-accounting-chart");
  await expect(chart).toBeVisible();
  await chart.scrollIntoViewIfNeeded();
  const tick = chart.getByText(name, { exact: true });
  await expect(tick).toBeVisible();
  const label = await tick.boundingBox();
  const bounds = await chart.boundingBox();
  await page.mouse.move(label.x + 4, bounds.y + 30);
  return card.getByTestId("exposure-accounting-tooltip");
}

// Successful empty inputs use zero; fetch failures report unavailable hours.
for (const scenario of [
  {
    name: "missing almanac",
    overrides: { almanac: { almanac_info: [] } },
    metric: "Fault (calculated)",
    hours: "0.00",
  },
  {
    name: "failed almanac",
    endpoint: "almanac",
    metric: "Fault (calculated)",
    hours: "NA",
  },
  {
    name: "missing accounting",
    exposures: { nightOnSkyAccounting: {} },
    metric: "Fault (calculated)",
    hours: "0.00",
  },
  {
    name: "failed accounting",
    exposures: { timeAccountingError: "unavailable" },
    metric: "Fault (calculated)",
    hours: "NA",
  },
  {
    name: "missing dome",
    exposures: { dayObsOpenDomeHours: {} },
    metric: "Closed Dome",
    hours: "0.00",
  },
  {
    name: "failed dome",
    exposures: { openDomeError: "unavailable" },
    metric: "Closed Dome",
    hours: "NA",
  },
  {
    name: "failed status uses zero weather loss",
    endpoint: "obs-status",
    metric: "Fault (calculated)",
    hours: "3.25",
    note: "Observatory Status data could not be fetched.",
  },
  {
    name: "empty status uses zero weather loss",
    overrides: {
      "obs-status": {
        entries: [],
        intervals: [],
        metrics: {},
        availability: { status: "full" },
      },
    },
    metric: "Fault (calculated)",
    hours: "3.25",
    note: "No observatory status data available.",
  },
]) {
  test(`${scenario.name}: tooltip distinguishes unavailable hours from zero`, async ({
    page,
  }) => {
    await setupApiMocks(page, {
      exposures: readyExposures(scenario.exposures),
      ...scenario.overrides,
    });
    if (scenario.endpoint)
      await page.route(`**/api/${scenario.endpoint}*`, (route) =>
        route.fulfill({ status: 500, body: "error" }),
      );
    await page.goto(TIME_ACCOUNTING_URL);
    const card = exposureTimeAccountingCard(page);
    const tooltip = await hoverCategory(page, card, scenario.metric);
    await expect(tooltip).toContainText(`Hours: ${scenario.hours}`);
    await expect(tooltip).toContainText(
      scenario.metric === "Closed Dome"
        ? "Closed dome so far during the night"
        : "Calculated fault time",
    );
    if (scenario.note) await expect(tooltip).toContainText(scenario.note);
  });
}

test("available zero dome hours display 0.00 rather than NA", async ({
  page,
}) => {
  await setupApiMocks(page, {
    exposures: {
      ...readyExposures({
        dayObsOpenDomeHours: { 20251231: { closed_hours: 0 } },
      }),
      open_dome_times: [
        {
          day_obs: 20251231,
          open_time: "2026-01-01T01:00:00Z",
          close_time: "2026-01-01T09:00:00Z",
          open_hours: 8,
        },
      ],
    },
  });
  await page.goto(TIME_ACCOUNTING_URL);
  await expect(
    await hoverCategory(page, exposureTimeAccountingCard(page), "Closed Dome"),
  ).toContainText("Hours: 0.00");
});
