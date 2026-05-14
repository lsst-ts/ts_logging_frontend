// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import { generateDataLogMockMultiBand } from "../../helpers/mock-generators.js";
import {
  waitForDataLogLoad,
  applyFilter,
  openColumnMenu,
  getDataLogUrl,
} from "../../helpers/datalog-helpers.js";

const DATALOG_URL = getDataLogUrl();
// 30 records cycling through y_10, g_10, r_10, i_10, z_10 — 6 each
const MULTI_BAND_DATA = generateDataLogMockMultiBand(30);

test.describe("Data-log page — filtering", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page, { "data-log": MULTI_BAND_DATA });
    await page.goto(DATALOG_URL);
    await waitForDataLogLoad(page);
  });

  test("filter by single value shows correct row count", async ({ page }) => {
    await applyFilter(page, "Filter", "y_10");
    await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(6);
  });

  test("filter by multiple values shows correct row count", async ({
    page,
  }) => {
    await applyFilter(page, "Filter", ["y_10", "g_10"]);
    await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(12);
  });

  test("Clear button in filter dropdown removes that filter", async ({
    page,
  }) => {
    await applyFilter(page, "Filter", "y_10");
    await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(6);

    await openColumnMenu(page, "Filter");
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(30);
  });

  test("Reset Table button clears all filters and URL params", async ({
    page,
  }) => {
    await applyFilter(page, "Filter", "y_10");
    await page.getByRole("button", { name: "Reset Table" }).click();

    await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(30);
    await expect(page).not.toHaveURL(/physical_filter=/);
  });

  test("applying a filter updates the URL", async ({ page }) => {
    await applyFilter(page, "Filter", "y_10");
    await expect(page).toHaveURL(/physical_filter=y_10/);
  });

  test("filter param in URL pre-filters the table on load", async ({
    page,
  }) => {
    await page.goto(`${DATALOG_URL}&physical_filter=y_10`);
    await waitForDataLogLoad(page);
    await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(6);
  });

  test("filter by multiple columns narrows results correctly", async ({
    page,
  }) => {
    // Custom data: 20 records with both varied physical_filter AND science_program,
    // so that filtering by physical_filter still leaves science_program with >1 unique value.
    const { generateDataLogMock } = await import(
      "../../helpers/mock-generators.js"
    );
    const multiColData = generateDataLogMock(20, {
      postProcess: (r, i) => ({
        ...r,
        physical_filter: i <= 10 ? "y_10" : "g_10", // 10 y_10, 10 g_10
        science_program: i % 2 === 1 ? "SURVEY" : "FM", // 5 SURVEY + 5 FM within each band
      }),
    });
    await setupApiMocks(page, { "data-log": multiColData });
    await page.goto(DATALOG_URL);
    await waitForDataLogLoad(page);

    // Filter by physical_filter=y_10 → 10 rows (5 SURVEY + 5 FM)
    await applyFilter(page, "Filter", "y_10");
    await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(10);

    // Filter by science_program=SURVEY → 5 rows
    await applyFilter(page, "Science Program", "SURVEY");
    await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(5);
  });

  test("unchecking a filter value removes it", async ({ page }) => {
    await applyFilter(page, "Filter", "y_10");
    await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(6);

    // Re-open the filter menu and uncheck y_10
    await openColumnMenu(page, "Filter");
    await page.getByRole("checkbox", { name: "y_10" }).click();
    await page.getByRole("button", { name: "Apply" }).click();
    await page.keyboard.press("Escape");

    await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(30);
  });

  test("filter param not present in data shows empty table", async ({
    page,
  }) => {
    // Navigate with a physical_filter value that doesn't match any record
    await page.goto(`${DATALOG_URL}&physical_filter=nonexistent`);
    await waitForDataLogLoad(page);
    await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(0);
  });
});
