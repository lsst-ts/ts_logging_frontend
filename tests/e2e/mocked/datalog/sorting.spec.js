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

const DATALOG_URL = getDataLogUrl();

test.describe("Data-log page — sorting", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await page.goto(DATALOG_URL);
    await waitForDataLogLoad(page);
  });

  test("default sort is exposure_id ascending — first row 000001, last row 000030", async ({
    page,
  }) => {
    const rows = page.locator("[data-slot='table-body'] tr");
    await expect(rows.first()).toContainText("20260101000001");
    await expect(rows.last()).toContainText("20260101000030");
  });

  test("default sort shows 🔼 on Exposure Id column header", async ({
    page,
  }) => {
    await expect(
      page.getByRole("columnheader").filter({ hasText: "🔼" }),
    ).toContainText("Exposure Id");
  });

  test("sort descending shows 🔽 and reverses row order", async ({ page }) => {
    await openColumnMenu(page, "Exposure Id");
    await page.getByText("Sort by desc.").click();

    await expect(
      page.getByRole("columnheader").filter({ hasText: "🔽" }),
    ).toContainText("Exposure Id");
    await expect(
      page.locator("[data-slot='table-body'] tr").first(),
    ).toContainText("20260101000030");
  });

  test("Unsort removes sort indicator from column header", async ({ page }) => {
    await openColumnMenu(page, "Exposure Id");
    await page.getByText("Sort by desc.").click();
    await openColumnMenu(page, "Exposure Id");
    await page.getByText("Unsort").click();

    await expect(
      page.getByRole("columnheader").filter({ hasText: "🔼" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("columnheader").filter({ hasText: "🔽" }),
    ).toHaveCount(0);
  });

  test("sorting by a string column shows correct alphabetical order", async ({
    page,
  }) => {
    // Use multi-program data so Science Program has distinct values to sort
    const multiProgramData = generateDataLogMockMultiProgram(30);
    await setupApiMocks(page, { "data-log": multiProgramData });
    await page.goto(DATALOG_URL);
    await waitForDataLogLoad(page);

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

  test("sorting by a numeric column shows correct numeric order", async ({
    page,
  }) => {
    // exposure_id is a large-integer numeric column with natural variation (1..30).
    // Default sort is asc; sorting desc should put the highest id first and lowest last.
    // Using Exposure Id (position 2 in table) avoids the adjacent-column tooltip interception
    // that affects columns deeper in the scroll region (e.g. Exposure Time (s) / Airmass).
    await openColumnMenu(page, "Exposure Id");
    await page.getByText("Sort by desc.").click();

    const rows = page.locator("[data-slot='table-body'] tr");
    await expect(rows.first()).toContainText("20260101000030");
    await expect(rows.last()).toContainText("20260101000001");
  });

  test("sorting is applied within filtered rows", async ({ page }) => {
    const multiBandData = generateDataLogMockMultiBand(30);
    await setupApiMocks(page, { "data-log": multiBandData });
    await page.goto(DATALOG_URL);
    await waitForDataLogLoad(page);

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

  test("Reset Table restores default ascending sort", async ({ page }) => {
    await openColumnMenu(page, "Exposure Id");
    await page.getByText("Sort by desc.").click();
    await expect(
      page.locator("[data-slot='table-body'] tr").first(),
    ).toContainText("20260101000030");

    await page.getByRole("button", { name: "Reset Table" }).click();

    await expect(
      page.locator("[data-slot='table-body'] tr").first(),
    ).toContainText("20260101000001");
    await expect(
      page.getByRole("columnheader").filter({ hasText: "🔼" }),
    ).toContainText("Exposure Id");
  });
});
