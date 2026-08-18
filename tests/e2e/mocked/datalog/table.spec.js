// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import {
  waitForDataLogLoad,
  getDataLogUrl,
  cellByHeader,
} from "../../helpers/datalog-helpers.js";

const DATALOG_URL = getDataLogUrl();

test.describe("Data-log page — table content and formatting", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await page.goto(DATALOG_URL);
    await waitForDataLogLoad(page);
  });

  test("RubinTV column shows 'Post-ISR Mosaic' link pointing to rubintv", async ({
    page,
  }) => {
    const link = page.getByRole("link", { name: "Post-ISR Mosaic" }).first();
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", /rubintv/);
    await expect(link).toHaveAttribute("href", /2026-01-01/);
  });

  test("first row cell values are formatted correctly", async ({ page }) => {
    const firstRow = page.locator("[data-slot='table-body'] tr").first();
    // exposure_id (integer ≥ 100) → no decimals
    await expect(firstRow).toContainText("20260101000001");
    // physical_filter → string passthrough
    await expect(firstRow).toContainText("y_10");
    // airmass = 1.3 → inferDecimals → 2 → "1.30"
    await expect(firstRow).toContainText("1.30");
    // img_type not in mock → undefined → "na"
    await expect(firstRow).toContainText("na");
    // sky_bg_median = 630 → ≥100 → 0 decimals
    const skyBgCell = await cellByHeader(page, firstRow, "Sky Brightness");
    await expect(skyBgCell).toHaveText("630");
    // exp_time = 30 → fixed { decimals: 2 } option overrides inference
    const expTimeCell = await cellByHeader(page, firstRow, "Exposure Time (s)");
    await expect(expTimeCell).toHaveText("30.00");
    // can_see_sky = true → boolean toString
    const canSeeSkyCell = await cellByHeader(page, firstRow, "Can See Sky");
    await expect(canSeeSkyCell).toHaveText("true");
  });

  test("correct columns are visible by default for Simonyi", async ({
    page,
  }) => {
    const visibleColumns = [
      "Exposure Id",
      "Science Program",
      "Airmass",
      "Filter",
      "Photometric ZP",
    ];
    for (const col of visibleColumns) {
      await expect(
        page.getByRole("columnheader").filter({ hasText: col }),
      ).toBeVisible();
    }
    // These are hidden by default
    const hiddenColumns = ["Seq Num", "Exposure Name", "Day Obs"];
    for (const col of hiddenColumns) {
      await expect(
        page.getByRole("columnheader").filter({ hasText: col }),
      ).toHaveCount(0);
    }
  });

  test("rows highlight on hover", async ({ page }) => {
    const row = page
      .locator("[data-slot='table-body'] [data-slot='table-row']")
      .first();
    // Move mouse away first to get the un-hovered background
    await page.mouse.move(0, 0);
    const bgBefore = await row.evaluate(
      (el) => window.getComputedStyle(el).backgroundColor,
    );
    await row.hover();
    const bgAfter = await row.evaluate(
      (el) => window.getComputedStyle(el).backgroundColor,
    );
    expect(bgAfter).not.toBe(bgBefore);
  });
});
