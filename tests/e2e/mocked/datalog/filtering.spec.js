// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import {
  generateDataLogMock,
  generateDataLogMockMultiBand,
} from "../../helpers/mock-generators.js";
import {
  waitForDataLogLoad,
  applyFilter,
  openColumnMenu,
  getDataLogUrl,
} from "../../helpers/datalog-helpers.js";
import { FULL_START, FULL_END } from "../../helpers/constants.js";

const DATALOG_URL = getDataLogUrl();
// 30 records cycling through y_10, g_10, r_10, i_10, z_10 — 6 each
const MULTI_BAND_DATA = generateDataLogMockMultiBand(30);

test.describe("Data-log page — filtering", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page, { "data-log": MULTI_BAND_DATA });
    await page.goto(DATALOG_URL);
    await waitForDataLogLoad(page);
  });

  test("Clear button in filter dropdown removes that filter and its URL param", async ({
    page,
  }) => {
    await applyFilter(page, "Filter", "y_10");
    await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(6);
    await expect(page).toHaveURL(/physical_filter=y_10/);

    await openColumnMenu(page, "Filter");
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(30);
    await expect(page).not.toHaveURL(/physical_filter=/);
  });

  test("unchecking a filter value removes it and its URL param", async ({
    page,
  }) => {
    await applyFilter(page, "Filter", "y_10");
    await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(6);

    // Re-open the filter menu and uncheck y_10
    await openColumnMenu(page, "Filter");
    await page.getByRole("checkbox", { name: "y_10" }).click();
    await page.getByRole("button", { name: "Apply" }).click();
    await page.keyboard.press("Escape");

    await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(30);
    await expect(page).not.toHaveURL(/physical_filter=/);
  });

  test("repeated URL param form applies a multi-value filter", async ({
    page,
  }) => {
    await page.goto(`${DATALOG_URL}&physical_filter=y_10&physical_filter=g_10`);
    await waitForDataLogLoad(page);
    await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(12);
  });

  test("comma-separated URL param value is treated as one literal value, not split", async ({
    page,
  }) => {
    // The router's parseSearch collects repeated params via getAll and never
    // splits commas, so "y_10,g_10" is a single (non-matching) filter value.
    await page.goto(`${DATALOG_URL}&physical_filter=y_10,g_10`);
    await waitForDataLogLoad(page);
    await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(0);
  });

  test("Reset Table clears filter params but preserves time range and scope params", async ({
    page,
  }) => {
    // Narrowed by an hour on each side — still covers all mock records
    const startTime = FULL_START + 3_600_000;
    const endTime = FULL_END - 3_600_000;
    await page.goto(
      `${DATALOG_URL}&physical_filter=y_10&startTime=${startTime}&endTime=${endTime}`,
    );
    await waitForDataLogLoad(page);
    await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(6);

    await page.getByRole("button", { name: "Reset Table" }).click();

    await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(30);
    await expect(page).not.toHaveURL(/physical_filter=/);
    await expect(page).toHaveURL(new RegExp(`startTime=${startTime}`));
    await expect(page).toHaveURL(new RegExp(`endTime=${endTime}`));
    await expect(page).toHaveURL(/telescope=Simonyi/);
    await expect(page).toHaveURL(/startDayobs=20260101/);
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

test.describe("Data-log page — filtering across multiple columns", () => {
  test.beforeEach(async ({ page }) => {
    // 20 records with both varied physical_filter AND science_program,
    // so that filtering by physical_filter still leaves science_program with >1 unique value.
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
  });

  test("filter by multiple columns narrows results correctly", async ({
    page,
  }) => {
    // Filter by physical_filter=y_10 → 10 rows (5 SURVEY + 5 FM)
    await applyFilter(page, "Filter", "y_10");
    await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(10);

    // Filter by science_program=SURVEY → 5 rows
    await applyFilter(page, "Science Program", "SURVEY");
    await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(5);
  });

  test("two filter params in the URL apply as an intersection", async ({
    page,
  }) => {
    await page.goto(
      `${DATALOG_URL}&physical_filter=y_10&science_program=SURVEY`,
    );
    await waitForDataLogLoad(page);
    await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(5);
  });
});

test.describe("Data-log page — URL params for other filterable columns", () => {
  test.beforeEach(async ({ page }) => {
    // 30 records with varied img_type, observation_reason, and target_name
    const variedData = generateDataLogMock(30, {
      postProcess: (r, i) => ({
        ...r,
        img_type: i <= 15 ? "science" : "bias",
        observation_reason: i % 2 === 1 ? "survey" : "calibration",
        target_name: i % 3 === 0 ? "FieldA" : "FieldB",
      }),
    });
    await setupApiMocks(page, { "data-log": variedData });
  });

  test("img_type, observation_reason, and target_name params all filter from the URL", async ({
    page,
  }) => {
    // i ≤ 15, odd, not divisible by 3 → {1, 5, 7, 11, 13} → 5 rows
    await page.goto(
      `${DATALOG_URL}&img_type=science&observation_reason=survey&target_name=FieldB`,
    );
    await waitForDataLogLoad(page);
    await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(5);
  });
});

test.describe("Data-log page — stale filter param on AuxTel", () => {
  test("physical_filter param is ignored on AuxTel (no such column)", async ({
    page,
  }) => {
    await setupApiMocks(page);
    await page.goto(
      `${getDataLogUrl("20260101", "AuxTel")}&physical_filter=y_10`,
    );
    await waitForDataLogLoad(page);
    // AuxTel has no physical_filter column, so the param has no effect
    await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(30);
  });
});
