// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import { downloadCsv } from "../../helpers/download-helpers.js";
import { TIME_ACCOUNTING_URL } from "../../helpers/constants.js";

const exposuresMock = (overrides = {}) => ({
  exposures: [],
  exposures_count: 0,
  sum_exposure_time: 7200,
  on_sky_exposures_count: 0,
  total_on_sky_exposure_time: 7200,
  open_dome_times: [],
  day_obs_open_dome_hours: {
    20251231: { night_hours: 8, open_hours: 6.75, closed_hours: 1.25 },
  },
  open_dome_error: null,
  night_on_sky_time_accounting: {
    sum_visit_gap_without_filter_change: 1.5,
    sum_overhead_without_filter_change: 0.5,
    sum_visit_gap_with_filter_change: 0.25,
    sum_overhead_with_filter_change: 0.75,
  },
  time_accounting_error: null,
  ...overrides,
});

function downloadButton(page) {
  return page
    .locator("[data-slot='card']")
    .filter({
      has: page.locator("[data-slot='card-title']", {
        hasText: /^Time Accounting$/,
      }),
    })
    .getByRole("button", { name: "Download CSV" });
}

// Turns the downloaded rows into a { Type: Duration } lookup.
const durationsByType = (rows) =>
  Object.fromEntries(rows.map((row) => [row.Type, row["Duration (hours)"]]));

test.describe("Time Accounting applet — download", () => {
  test("downloads each bar's duration and the time spent exposing", async ({
    page,
  }) => {
    await setupApiMocks(page, { exposures: exposuresMock() });
    await page.goto(TIME_ACCOUNTING_URL);

    const { filename, headers, rows } = await downloadCsv(
      page,
      downloadButton(page),
    );

    expect(filename).toBe(
      "nightlydigest_time-accounting_Simonyi_20260101-20260101.csv",
    );
    expect(headers).toEqual(["Type", "Duration (hours)"]);
    expect(rows.map((row) => row.Type)).toEqual([
      "Gaps",
      "Overhead",
      "Gaps (Filter)",
      "Overhead (Filter)",
      "Fault (calculated)",
      "Closed Dome",
      "Exposing",
    ]);

    const durations = durationsByType(rows);
    expect(durations).toMatchObject({
      Gaps: "1.50",
      Overhead: "0.50",
      "Gaps (Filter)": "0.25",
      "Overhead (Filter)": "0.75",
      "Closed Dome": "1.25",
      Exposing: "2.00",
    });
    expect(durations["Fault (calculated)"]).toMatch(/^\d+\.\d{2}$/);
  });

  test("leaves unavailable durations blank instead of 0", async ({ page }) => {
    await setupApiMocks(page, {
      exposures: exposuresMock({ open_dome_error: "Dome query failed" }),
    });
    await page.goto(TIME_ACCOUNTING_URL);

    const { rows } = await downloadCsv(page, downloadButton(page));

    expect(durationsByType(rows)["Closed Dome"]).toBe("");
  });
});
