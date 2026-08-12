// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import { generateDataLogMock } from "../../helpers/mock-generators.js";
import {
  waitForDataLogLoad,
  getDataLogUrl,
  cellByHeader,
} from "../../helpers/datalog-helpers.js";

const SIMONYI_URL = getDataLogUrl();
const AUXTEL_URL = getDataLogUrl("20260101", "AuxTel");

// RubinTVLink derives the telescope from the exposure_name prefix (MC → Simonyi,
// AT → AuxTel), not from the page's telescope param.
const SIMONYI_DATA = generateDataLogMock(3);
const AUXTEL_DATA = generateDataLogMock(3, {
  postProcess: (r) => ({
    ...r,
    exposure_name: r.exposure_name.replace(/^MC/, "AT"),
  }),
});

// The host portion of the URL varies by deployment (localhost falls back to
// DEFAULT_EXTERNAL_INSTANCE_URL), and getRubinTVUrl is already unit-tested in
// tests/utils.test.js — so assert the exposure-specific parts here.

test.describe("Data-log page — RubinTV column (Simonyi)", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page, { "data-log": SIMONYI_DATA });
    await page.goto(SIMONYI_URL);
    await waitForDataLogLoad(page);
  });

  test("RubinTV cell renders a Post-ISR Mosaic link for the row's exposure", async ({
    page,
  }) => {
    // Default sort ascending — first row is MC_O_20260101_000001 (seq 1)
    const firstRow = page.locator("[data-slot='table-body'] tr").first();
    const cell = await cellByHeader(page, firstRow, "RubinTV");
    const link = cell.getByRole("link", { name: "Post-ISR Mosaic" });

    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", /\/rubintv\/[^/]+\/lsstcam\//);
    await expect(link).toHaveAttribute(
      "href",
      /channel_name=focal_plane_mosaic&date_str=2026-01-01&seq_num=1$/,
    );
  });

  test("the link opens in a new tab with a safe rel", async ({ page }) => {
    const firstRow = page.locator("[data-slot='table-body'] tr").first();
    const link = firstRow.getByRole("link", { name: "Post-ISR Mosaic" });

    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  test("every row gets a link pointing at its own seq_num", async ({
    page,
  }) => {
    const links = page
      .locator("[data-slot='table-body'] tr")
      .getByRole("link", { name: "Post-ISR Mosaic" });
    await expect(links).toHaveCount(3);

    for (let i = 0; i < 3; i++) {
      await expect(links.nth(i)).toHaveAttribute(
        "href",
        new RegExp(`seq_num=${i + 1}$`),
      );
    }
  });
});

test.describe("Data-log page — RubinTV column (AuxTel)", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page, { "data-log": AUXTEL_DATA });
    await page.goto(AUXTEL_URL);
    await waitForDataLogLoad(page);
  });

  test("AT exposures link to the AuxTel monitor channel", async ({ page }) => {
    const firstRow = page.locator("[data-slot='table-body'] tr").first();
    const cell = await cellByHeader(page, firstRow, "RubinTV");
    const link = cell.getByRole("link", { name: "Mount Monitor" });

    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", /\/rubintv\/[^/]+\/auxtel\//);
    await expect(link).toHaveAttribute(
      "href",
      /channel_name=monitor&date_str=2026-01-01&seq_num=1$/,
    );
  });
});

test.describe("Data-log page — RubinTV column with unusable identifiers", () => {
  test.beforeEach(async ({ page }) => {
    // No day_obs/seq_num, and an exposure_name too short for the 20-char
    // fallback schema — getRubinTVUrl returns null, so no link is rendered.
    const brokenData = generateDataLogMock(3, {
      postProcess: (r) => ({
        ...r,
        day_obs: null,
        seq_num: null,
        exposure_name: "BAD_NAME",
      }),
    });
    await setupApiMocks(page, { "data-log": brokenData });
    await page.goto(SIMONYI_URL);
    await waitForDataLogLoad(page);
  });

  test("no link is rendered when the URL cannot be built", async ({ page }) => {
    const firstRow = page.locator("[data-slot='table-body'] tr").first();
    const cell = await cellByHeader(page, firstRow, "RubinTV");

    await expect(cell.getByRole("link")).toHaveCount(0);
    await expect(cell).toHaveText("");
  });
});
