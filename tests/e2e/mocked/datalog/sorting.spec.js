// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import {
  generateDataLogMockMultiBand,
  generateDataLogMockMultiProgram,
} from "../../helpers/mock-generators.js";
import {
  waitForDataLogLoad,
  openColumnMenu,
  applyFilter,
  getDataLogUrl,
} from "../../helpers/datalog-helpers.js";

// Sort indicators, the asc/desc/unsort cycle and reset-restores-sort are
// DataTable behaviour and live in components/datatable/sorting.spec.js. What is
// left here needs data-log's own columns and fixtures.
const DATALOG_URL = getDataLogUrl();

test.describe("Data-log page — sorting with multi-program data", () => {
  test.beforeEach(async ({ page }) => {
    // Multi-program data so Science Program has distinct values to sort
    await setupApiMocks(page, {
      "data-log": generateDataLogMockMultiProgram(30),
    });
    await page.goto(DATALOG_URL);
    await waitForDataLogLoad(page);
  });

  test("sorting by a string column shows correct alphabetical order", async ({
    page,
  }) => {
    await openColumnMenu(page, "Science Program");
    await page.getByText("Sort by asc.").click();

    // Alphabetically first program is "BF" — should appear in first row
    await expect(
      page.locator("[data-slot='table-body'] tr").first(),
    ).toContainText("BF");
    await expect(
      page.getByRole("columnheader").filter({ hasText: "🔼" }),
    ).toContainText("Science Program");
  });
});

test.describe("Data-log page — sorting with multi-band data", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page, { "data-log": generateDataLogMockMultiBand(30) });
    await page.goto(DATALOG_URL);
    await waitForDataLogLoad(page);
  });

  test("sorting is applied within filtered rows", async ({ page }) => {
    // Filter to y_10 (seq_nums 5,10,15,20,25,30 → max exposure_id = 20260101000030)
    await applyFilter(page, "Filter", "y_10");
    await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(6);

    // Sort Exposure Id desc — highest id should be first
    await openColumnMenu(page, "Exposure Id");
    await page.getByText("Sort by desc.").click();

    await expect(
      page.locator("[data-slot='table-body'] tr").first(),
    ).toContainText("20260101000030");
    await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(6);
  });
});
