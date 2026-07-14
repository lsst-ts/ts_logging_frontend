// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import {
  generateDataLogMock,
  generateDataLogMockMultiBand,
} from "../../helpers/mock-generators.js";
import {
  waitForDataLogLoad,
  openColumnMenu,
  applyFilter,
  getDataLogUrl,
  cellByHeader,
} from "../../helpers/datalog-helpers.js";

const DATALOG_URL = getDataLogUrl();

test.describe("Data-log page — RubinTV link fallback", () => {
  test.beforeEach(async ({ page }) => {
    // day_obs and seq_num missing, but the 20-char exposure_name is intact —
    // RubinTVLink should derive both from the name
    const fallbackData = generateDataLogMock(3, {
      postProcess: (r) => ({ ...r, day_obs: null, seq_num: null }),
    });
    await setupApiMocks(page, { "data-log": fallbackData });
    await page.goto(DATALOG_URL);
    await waitForDataLogLoad(page);
  });

  test("link is derived from exposure_name when day_obs/seq_num are null", async ({
    page,
  }) => {
    // First row is MC_O_20260101_000001 → dayObs 20260101, seqNum 1
    const firstRow = page.locator("[data-slot='table-body'] tr").first();
    const link = firstRow.getByRole("link", { name: "Post-ISR Mosaic" });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", /date_str=2026-01-01/);
    await expect(link).toHaveAttribute("href", /seq_num=1$/);
  });
});

test.describe("Data-log page — null science program", () => {
  test.beforeEach(async ({ page }) => {
    // seq 1-5 SURVEY, seq 6-10 null
    const nullProgramData = generateDataLogMock(10, {
      postProcess: (r, i) => ({
        ...r,
        science_program: i <= 5 ? "SURVEY" : null,
      }),
    });
    await setupApiMocks(page, { "data-log": nullProgramData });
    await page.goto(DATALOG_URL);
    await waitForDataLogLoad(page);
  });

  test("null science program cells render empty", async ({ page }) => {
    // Row 6 (index 5) has science_program: null
    const nullRow = page.locator("[data-slot='table-body'] tr").nth(5);
    const cell = await cellByHeader(page, nullRow, "Science Program");
    await expect(cell).toHaveText("");
  });

  test("filter dropdown offers a null bucket", async ({ page }) => {
    await openColumnMenu(page, "Science Program");
    await expect(page.getByRole("checkbox", { name: "SURVEY" })).toBeVisible();
    await expect(page.getByRole("checkbox", { name: "null" })).toBeVisible();
  });

  test("filtering by a real value excludes null rows", async ({ page }) => {
    await applyFilter(page, "Science Program", "SURVEY");
    await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(5);
  });
});

test.describe("Data-log page — null numeric values", () => {
  test.beforeEach(async ({ page }) => {
    // seq 1-4 have increasing airmass, seq 5-6 have null
    const nullAirmassData = generateDataLogMock(6, {
      postProcess: (r, i) => ({
        ...r,
        airmass: i <= 4 ? 1.0 + i * 0.1 : null,
      }),
    });
    await setupApiMocks(page, { "data-log": nullAirmassData });
    await page.goto(DATALOG_URL);
    await waitForDataLogLoad(page);
  });

  test("null numeric cells render 'na'", async ({ page }) => {
    const nullRow = page.locator("[data-slot='table-body'] tr").nth(4);
    const cell = await cellByHeader(page, nullRow, "Airmass");
    await expect(cell).toHaveText("na");
  });

  test("sorting a numeric column containing nulls does not crash; nulls sort first ascending", async ({
    page,
  }) => {
    await openColumnMenu(page, "Airmass");
    await page.getByText("Sort by asc.").click();

    // All 6 rows still present
    const rows = page.locator("[data-slot='table-body'] tr");
    await expect(rows).toHaveCount(6);

    // Nulls compare like 0 in the basic sort, so the two na rows come first
    const firstCell = await cellByHeader(page, rows.first(), "Airmass");
    await expect(firstCell).toHaveText("na");
    const lastCell = await cellByHeader(page, rows.last(), "Airmass");
    await expect(lastCell).toHaveText("1.40");
  });
});

test.describe("Data-log page — boolean and negative values", () => {
  test.beforeEach(async ({ page }) => {
    // Odd seq_nums can see sky, even can't; all have a negative air temp
    const mixedData = generateDataLogMock(10, {
      postProcess: (r, i) => ({
        ...r,
        can_see_sky: i % 2 === 1,
        air_temp: -5.5,
      }),
    });
    await setupApiMocks(page, { "data-log": mixedData });
    await page.goto(DATALOG_URL);
    await waitForDataLogLoad(page);
  });

  test("boolean cells render 'true' and 'false'", async ({ page }) => {
    const rows = page.locator("[data-slot='table-body'] tr");
    const trueCell = await cellByHeader(page, rows.nth(0), "Can See Sky");
    await expect(trueCell).toHaveText("true");
    const falseCell = await cellByHeader(page, rows.nth(1), "Can See Sky");
    await expect(falseCell).toHaveText("false");
  });

  test("filtering a boolean column via checkbox works", async ({ page }) => {
    await applyFilter(page, "Can See Sky", "true");
    await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(5);
  });

  test("negative numbers format with two decimals", async ({ page }) => {
    const firstRow = page.locator("[data-slot='table-body'] tr").first();
    const cell = await cellByHeader(page, firstRow, "Outside Air Temp");
    await expect(cell).toHaveText("-5.50");
  });
});

test.describe("Data-log page — filter menu visibility by unique values", () => {
  test("column with a single unique value offers no filter section", async ({
    page,
  }) => {
    // Default fixture: all 30 records are y_10
    await setupApiMocks(page);
    await page.goto(DATALOG_URL);
    await waitForDataLogLoad(page);

    await openColumnMenu(page, "Filter");
    const menu = page.getByRole("menu");
    await expect(menu.getByText("Sort by asc.")).toBeVisible();
    await expect(menu.getByText("Filter:")).toHaveCount(0);
  });

  test("column with multiple unique values offers a filter section", async ({
    page,
  }) => {
    await setupApiMocks(page, { "data-log": generateDataLogMockMultiBand(30) });
    await page.goto(DATALOG_URL);
    await waitForDataLogLoad(page);

    await openColumnMenu(page, "Filter");
    const menu = page.getByRole("menu");
    await expect(menu.getByText("Filter:")).toBeVisible();
  });
});
