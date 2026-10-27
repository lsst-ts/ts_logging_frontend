// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import { waitForTimeAccountingLoad } from "../../helpers/time-accounting-helpers.js";

// Two eight-hour nights; Almanac labels are one day ahead.
const almanac = [1, 2].map((day) => ({
  dayobs: 20260100 + day + 1,
  night_hours: 8,
  elapsed_twilight_hours: 8,
  twilight_evening_0deg: `2026-01-0${day} 19:30:00`,
  twilight_morning_0deg: `2026-01-0${day + 1} 04:30:00`,
  moon_rise_time: `2026-01-0${day} 22:00:00`,
  moon_set_time: `2026-01-0${day + 1} 02:00:00`,
  moon_illumination: "50%",
  twilight_evening_12deg: `2026-01-0${day} 20:00:00`,
  twilight_morning_12deg: `2026-01-0${day + 1} 04:00:00`,
}));
const intervals = [1, 2].map((day) => ({
  start_time_ms: Date.parse(`2026-01-0${day}T21:00:00Z`),
  end_time_ms: Date.parse(`2026-01-0${day}T23:00:00Z`),
  start_state: 2,
  end_state: 2,
  start_labels: "OPERATIONAL",
  end_labels: "OPERATIONAL",
}));
const cardFor = (page, mode) =>
  page.getByTestId("applet-card").filter({
    hasText: `Observatory Status - ${mode} Night Accumulations`,
  });
// Read rendered SVG axis labels.
const largestTick = async (plot) =>
  Math.max(
    ...(await plot.getByText(/^\d+(\.\d+)?$/).allTextContents()).map(Number),
  );

test("multi-night accumulation uses the combined hours in both embedded and fullscreen plots", async ({
  page,
}) => {
  await setupApiMocks(page, {
    almanac: { almanac_info: almanac },
    "obs-status": {
      entries: intervals.map((interval) => ({
        time_ms: interval.start_time_ms,
        status: 2,
      })),
      intervals,
      metrics: {},
      totals: {},
      availability: { status: "full" },
    },
  });
  await page.goto(
    "time-accounting?startDayobs=20260101&endDayobs=20260102&telescope=Simonyi",
  );
  await waitForTimeAccountingLoad(page);
  const single = cardFor(page, "Single").getByTestId(
    "obs-status-cumulative-plot",
  );
  const multiCard = cardFor(page, "Multi");
  const multi = multiCard.getByTestId("obs-status-cumulative-plot");
  await expect.poll(() => largestTick(single)).toBe(8);
  // ECharts rounds axis limits; unit tests check exact totals.
  await expect.poll(() => largestTick(multi)).toBeGreaterThanOrEqual(16);
  expect(await largestTick(multi)).toBeLessThan(24);
  await multiCard
    .getByRole("button", { name: "Open observatory status in fullscreen" })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect
    .poll(() => largestTick(dialog.getByTestId("obs-status-cumulative-plot")))
    .toBeGreaterThanOrEqual(16);
  expect(
    await largestTick(dialog.getByTestId("obs-status-cumulative-plot")),
  ).toBeLessThan(24);
});
