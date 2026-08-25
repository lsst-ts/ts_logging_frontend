// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import {
  generateDataLogMock,
  generateDataLogMockMultiBand,
} from "../../helpers/mock-generators.js";
import {
  waitForDataLogLoad,
  groupBy,
  applyFilter,
  getDataLogUrl,
} from "../../helpers/datalog-helpers.js";

const DATALOG_URL = getDataLogUrl();
// 30 records, 5 physical_filter values × 6 each
const MULTI_BAND_DATA = generateDataLogMockMultiBand(30);

test.describe("Data-log page — grouping", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page, { "data-log": MULTI_BAND_DATA });
    await page.goto(DATALOG_URL);
    await waitForDataLogLoad(page);
  });

  test("grouping by two columns nests the second inside the first", async ({
    page,
  }) => {
    await groupBy(page, "Filter");
    await groupBy(page, "Science Program");
    await page.getByRole("button", { name: "Expand All Groups" }).click();

    // 5 filter groups, each with one SURVEY subgroup, plus 30 data rows
    await expect(page.locator("td.bg-stone-900")).toHaveCount(10);
    await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(40);
    await expect(
      page.getByText(/Science Program: SURVEY \(6\)/).first(),
    ).toBeVisible();
  });

  test("grouping then filtering shows only matching groups", async ({
    page,
  }) => {
    await groupBy(page, "Filter");
    // 5 collapsed groups
    await expect(page.locator("td.bg-stone-900")).toHaveCount(5);

    await applyFilter(page, "Filter", "y_10");
    // Only 1 group remains after filter
    await expect(page.locator("td.bg-stone-900")).toHaveCount(1);
    await expect(page.getByText(/Filter: y_10/)).toBeVisible();
  });
});

test.describe("Data-log page — grouping with null values", () => {
  test.beforeEach(async ({ page }) => {
    const nullAirmassData = generateDataLogMock(5, {
      postProcess: (r) => ({ ...r, airmass: null }),
    });
    await setupApiMocks(page, { "data-log": nullAirmassData });
    await page.goto(DATALOG_URL);
    await waitForDataLogLoad(page);
  });

  test("grouping column with null values shows NA group", async ({ page }) => {
    await groupBy(page, "Airmass");
    await expect(page.getByText(/Airmass: NA/)).toBeVisible();
  });
});
