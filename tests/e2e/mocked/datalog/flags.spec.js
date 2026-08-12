// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import {
  generateDataLogMock,
  generateExposureLogMock,
} from "../../helpers/mock-generators.js";
import {
  waitForDataLogLoad,
  applyFilter,
  groupBy,
  getDataLogUrl,
  cellByHeader,
} from "../../helpers/datalog-helpers.js";

const DATALOG_URL = getDataLogUrl();

// 30 ConsDB records (exposure names MC_O_20260101_000001..000030), with
// exposure-log entries for the first 12: 6 flagged "junk" with a comment,
// 6 flagged "questionable". The remaining 18 have no matching entry, so the
// merge falls back to exposure_flag "none" and an empty comment.
const DATA_LOG = generateDataLogMock(30);
const EXPOSURE_LOG = generateExposureLogMock([
  ...[1, 2, 3, 4, 5, 6].map((i) => ({
    obs_id: `MC_O_20260101_${i.toString().padStart(6, "0")}`,
    exposure_flag: "junk",
    message_text: "Shutter stuck",
  })),
  ...[7, 8, 9, 10, 11, 12].map((i) => ({
    obs_id: `MC_O_20260101_${i.toString().padStart(6, "0")}`,
    exposure_flag: "questionable",
    message_text: "Passing cloud",
  })),
]);

test.describe("Data-log page — exposure log flags and comments", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page, {
      "data-log": DATA_LOG,
      "exposure-entries": EXPOSURE_LOG,
    });
    await page.goto(DATALOG_URL);
    await waitForDataLogLoad(page);
  });

  test("rows with a matching exposure-log entry show its flag and comment", async ({
    page,
  }) => {
    // Default sort is exposure_id ascending — first row is seq 000001 (junk)
    const firstRow = page.locator("[data-slot='table-body'] tr").first();
    const flagsCell = await cellByHeader(page, firstRow, "Flags");
    await expect(flagsCell).toHaveText("junk");
    const commentsCell = await cellByHeader(page, firstRow, "Comments");
    await expect(commentsCell).toHaveText("Shutter stuck");
  });

  test("rows without a matching entry fall back to 'none' and empty comment", async ({
    page,
  }) => {
    // Last row is seq 000030, which has no exposure-log entry
    const lastRow = page.locator("[data-slot='table-body'] tr").last();
    const flagsCell = await cellByHeader(page, lastRow, "Flags");
    await expect(flagsCell).toHaveText("none");
    // message_text falls back to "" which formatCellValue renders as "na"
    const commentsCell = await cellByHeader(page, lastRow, "Comments");
    await expect(commentsCell).toHaveText("na");
  });

  test("filtering by a flag value shows only flagged rows", async ({
    page,
  }) => {
    await applyFilter(page, "Flags", "junk");
    await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(6);
  });

  test("filtering by 'none' alongside a real flag includes unmatched rows", async ({
    page,
  }) => {
    await applyFilter(page, "Flags", ["junk", "none"]);
    await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(24);
  });

  test("Flags filter is table-only and does not write to the URL", async ({
    page,
  }) => {
    // exposure_flag has no urlParam — its filter lives in local state only
    await applyFilter(page, "Flags", "junk");
    await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(6);
    expect(page.url()).not.toContain("exposure_flag");
    expect(page.url()).not.toContain("junk");
  });

  test("Reset Table clears a table-only filter", async ({ page }) => {
    await applyFilter(page, "Flags", "junk");
    await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(6);

    await page.getByRole("button", { name: "Reset Table" }).click();
    await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(30);
  });

  test("grouping by Flags shows correct group counts", async ({ page }) => {
    await groupBy(page, "Flags");
    await expect(page.getByText(/Flags: junk \(6\)/)).toBeVisible();
    await expect(page.getByText(/Flags: questionable \(6\)/)).toBeVisible();
    await expect(page.getByText(/Flags: none \(18\)/)).toBeVisible();
  });
});
