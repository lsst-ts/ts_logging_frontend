// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import { waitForPlotsLoad } from "../../helpers/plots-helpers.js";
import { downloadCsv } from "../../helpers/download-helpers.js";
import { PLOTS_URL } from "../../helpers/constants.js";

const KEY_COLUMNS = [
  "exposure_id",
  "exposure_name",
  "obs_start",
  "day_obs",
  "seq_num",
  "science_program",
  "observation_reason",
];
const DEFAULT_PLOTS = [
  "airmass",
  "psf_median",
  "zero_point_median",
  "sky_bg_median",
];

// Fixture records start at 2026-01-02T00:00:00Z, one per minute; this window
// covers the first 15 of the 30.
const WINDOW_START = 1767312000000;
const WINDOW_END = WINDOW_START + 14 * 60_000;

test.describe("Plots — download", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });

  test("downloads the key columns and the visible plots", async ({ page }) => {
    await page.goto(PLOTS_URL);
    await waitForPlotsLoad(page);

    const { filename, headers, rows } = await downloadCsv(page);

    expect(filename).toBe("nightlydigest_plots_Simonyi_20260101-20260101.csv");
    expect(headers).toEqual([...KEY_COLUMNS, ...DEFAULT_PLOTS]);
    expect(rows).toHaveLength(30);
    expect(rows[0].exposure_id).toBe("20260101000001");
  });

  test("columns follow the selected plots", async ({ page }) => {
    await page.goto(PLOTS_URL);
    await waitForPlotsLoad(page);

    await page.getByRole("button", { name: "Show / Hide Plots" }).click();
    await page.locator("label[for='plot-selected-exp_time']").click();
    await page.locator("label[for='plot-selected-airmass']").click();
    await page.keyboard.press("Escape");

    const { headers } = await downloadCsv(page);

    expect(headers).toContain("exp_time");
    expect(headers).not.toContain("airmass");
  });

  test("downloads every loaded exposure, ignoring the selected time range", async ({
    page,
  }) => {
    await page.goto(
      `${PLOTS_URL}&startTime=${WINDOW_START}&endTime=${WINDOW_END}`,
    );
    await waitForPlotsLoad(page);

    const { rows } = await downloadCsv(page);

    expect(rows).toHaveLength(30);
  });
});
