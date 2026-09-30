// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import { generateExposuresMock } from "../../helpers/mock-generators.js";
import { downloadCsv } from "../../helpers/download-helpers.js";
import { DIGEST_URL } from "../../helpers/constants.js";

// Mock records start at 2026-01-02T00:00:00Z, one per minute; this window
// covers the first 15 of the 30.
const WINDOW_START = 1767312000000;
const WINDOW_END = WINDOW_START + 14 * 60_000;

function observingConditionsCard(page) {
  return page.locator("[data-slot='card']").filter({
    has: page.locator("[data-slot='card-title']", {
      hasText: "Observing Conditions",
    }),
  });
}

function downloadButton(page) {
  return observingConditionsCard(page).getByRole("button", {
    name: "Download CSV",
  });
}

test.describe("Observing Conditions applet — download", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page, { exposures: generateExposuresMock(30) });
  });

  test("downloads the key columns and the plotted values", async ({ page }) => {
    await page.goto(DIGEST_URL);
    await expect(downloadButton(page)).toBeEnabled();

    const { filename, headers, rows } = await downloadCsv(
      page,
      downloadButton(page),
    );

    expect(filename).toBe(
      "nightlydigest_observing-conditions_Simonyi_20260101-20260101.csv",
    );
    expect(headers).toEqual([
      "exposure_id",
      "exposure_name",
      "obs_start",
      "day_obs",
      "seq_num",
      "science_program",
      "observation_reason",
      "psf_median",
      "zero_point_median",
      "physical_filter",
    ]);
    expect(rows).toHaveLength(30);
    expect(rows[0]).toMatchObject({
      exposure_id: "20260101000001",
      zero_point_median: "32",
      physical_filter: "y_10",
    });
    // psf_sigma_median 2.8 x 2.355 (sigma to FWHM) x 0.2 (default pixel scale)
    expect(Number(rows[0].psf_median)).toBeCloseTo(1.3188);
  });

  test("downloads every loaded exposure, ignoring the selected time range", async ({
    page,
  }) => {
    await page.goto(
      `${DIGEST_URL}&startTime=${WINDOW_START}&endTime=${WINDOW_END}`,
    );
    await expect(downloadButton(page)).toBeEnabled();

    const { rows } = await downloadCsv(page, downloadButton(page));

    expect(rows).toHaveLength(30);
  });
});
