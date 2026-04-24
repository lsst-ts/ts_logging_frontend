// @ts-check
import { test, expect } from "@playwright/test";
import {
  setupDataLogMocks,
  waitForDataLogLoad,
  clickColumnMenuItem,
} from "../../helpers/data-log-helpers.js";
import { generateDataLogMock } from "../../helpers/mock-generators.js";
import { DATA_LOG_URL_AUXTEL } from "../../helpers/constants.js";

// AuxTel exposure names use the AT_ prefix (20-char format: AT_O_YYYYMMDD_NNNNNN)
function buildAuxTelMock(count = 5) {
  return generateDataLogMock(count, {
    postProcess: (r) => {
      const seqNumStr = String(r.seq_num).padStart(6, "0");
      return {
        ...r,
        exposure_name: `AT_O_20260101_${seqNumStr}`,
      };
    },
  });
}

test.describe("Data Log — AuxTel", () => {
  test.beforeEach(async ({ page }) => {
    await setupDataLogMocks(page, { "data-log": buildAuxTelMock() });
    await page.goto(DATA_LOG_URL_AUXTEL);
    await waitForDataLogLoad(page);
  });

  // ---- Column differences vs Simonyi ----

  test("Simonyi-only columns are absent", async ({ page }) => {
    // AuxTel columns array only contains commonColumns — no Filter, Median PSF,
    // Sky Brightness, Photometric ZP, High SNR Source Counts
    for (const header of [
      "Filter",
      "Median PSF",
      "Sky Brightness",
      "Photometric ZP",
      "High SNR Source Counts",
    ]) {
      await expect(
        page.locator("th").filter({ hasText: header }),
        `"${header}" should not be present for AuxTel`,
      ).toHaveCount(0);
    }
  });

  test("common columns are present", async ({ page }) => {
    for (const header of ["Airmass", "Science Program", "Obs Start (TAI)"]) {
      await expect(
        page.locator("th").filter({ hasText: header }).first(),
        `"${header}" should be visible for AuxTel`,
      ).toBeVisible();
    }
  });

  // ---- Default visibility differences ----

  test("Exposure Id is hidden by default for AuxTel", async ({ page }) => {
    await expect(
      page.locator("th").filter({ hasText: "Exposure Id" }),
    ).toHaveCount(0);
  });

  test("Exposure Name is visible by default for AuxTel", async ({ page }) => {
    await expect(
      page.locator("th").filter({ hasText: "Exposure Name" }).first(),
    ).toBeVisible();
  });

  test("Outside Air Temp is hidden by default for AuxTel", async ({ page }) => {
    await expect(
      page.locator("th").filter({ hasText: "Outside Air Temp" }),
    ).toHaveCount(0);
  });

  // ---- RubinTV link ----

  test('link text is "Mount Monitor" not "Post-ISR Mosaic"', async ({
    page,
  }) => {
    await expect(
      page.getByRole("link", { name: "Mount Monitor" }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Post-ISR Mosaic" }),
    ).toHaveCount(0);
  });

  test("link href contains auxtel and monitor", async ({ page }) => {
    const link = page.getByRole("link", { name: "Mount Monitor" }).first();
    const href = await link.getAttribute("href");
    expect(href).toContain("auxtel");
    expect(href).toContain("monitor");
  });

  test("link href does NOT contain lsstcam or focal_plane_mosaic", async ({
    page,
  }) => {
    const link = page.getByRole("link", { name: "Mount Monitor" }).first();
    const href = await link.getAttribute("href");
    expect(href).not.toContain("lsstcam");
    expect(href).not.toContain("focal_plane_mosaic");
  });

  // ---- Functional parity ----

  test("sorting works for AuxTel", async ({ page }) => {
    await clickColumnMenuItem(page, "Airmass", "Sort by asc.");
    await expect(page.locator("tbody tr")).toHaveCount(5);
  });

  test("Reset Table works for AuxTel", async ({ page }) => {
    await page.getByRole("button", { name: "Reset Table" }).click();
    await expect(page.locator("tbody tr")).toHaveCount(5);
    // After reset, AuxTel defaults: Exposure Name visible, Exposure Id hidden
    await expect(
      page.locator("th").filter({ hasText: "Exposure Name" }).first(),
    ).toBeVisible();
    await expect(
      page.locator("th").filter({ hasText: "Exposure Id" }),
    ).toHaveCount(0);
  });
});
