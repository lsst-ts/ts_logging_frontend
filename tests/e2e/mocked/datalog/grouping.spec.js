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
  openColumnMenu,
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

  test("grouping by a column shows collapsed group headers", async ({
    page,
  }) => {
    await groupBy(page, "Filter");
    // Groups start collapsed — only 5 group header rows visible
    await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(5);
    await expect(page.locator("td.bg-stone-900")).toHaveCount(5);
  });

  test("group header shows correct label and count", async ({ page }) => {
    await groupBy(page, "Filter");
    // Format: "▸ Filter: y_10 (6)"
    await expect(page.getByText(/Filter: y_10 \(6\)/)).toBeVisible();
  });

  test("Expand All Groups shows all data rows", async ({ page }) => {
    await groupBy(page, "Filter");
    await page.getByRole("button", { name: "Expand All Groups" }).click();
    // 5 group headers + 30 data rows
    await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(35);
  });

  test("Collapse All Groups hides data rows", async ({ page }) => {
    await groupBy(page, "Filter");
    await page.getByRole("button", { name: "Expand All Groups" }).click();
    await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(35);

    await page.getByRole("button", { name: "Collapse All Groups" }).click();
    await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(5);
  });

  test("Reset Table removes grouping", async ({ page }) => {
    await groupBy(page, "Filter");
    await page.getByRole("button", { name: "Reset Table" }).click();
    await expect(page.locator("td.bg-stone-900")).toHaveCount(0);
    await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(30);
  });

  test("Expand All Groups button is disabled before grouping and enabled after", async ({
    page,
  }) => {
    // Before grouping: no group rows → allExpanded is vacuously true →
    // button shows "Collapse All Groups" but is disabled
    await expect(
      page.getByRole("button", { name: "Collapse All Groups" }),
    ).toBeDisabled();

    await groupBy(page, "Filter");

    // After grouping with collapsed groups: button shows "Expand All Groups" and is enabled
    await expect(
      page.getByRole("button", { name: "Expand All Groups" }),
    ).toBeEnabled();
  });

  test("clicking a group header expands then collapses that group", async ({
    page,
  }) => {
    await groupBy(page, "Filter");
    // Groups start collapsed — 5 headers, 0 data rows
    await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(5);

    // Click the y_10 group header to expand it
    await page.locator("td.bg-stone-900").filter({ hasText: "y_10" }).click();
    // 5 headers + 6 y_10 data rows = 11
    await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(11);

    // Click again to collapse
    await page.locator("td.bg-stone-900").filter({ hasText: "y_10" }).click();
    await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(5);
  });

  test("Ungroup via the column menu removes grouping", async ({ page }) => {
    await groupBy(page, "Filter");
    await expect(page.locator("td.bg-stone-900")).toHaveCount(5);

    // The menu item label flips to "Ungroup" for a grouped column
    await openColumnMenu(page, "Filter");
    await page.getByText("Ungroup").click();

    await expect(page.locator("td.bg-stone-900")).toHaveCount(0);
    await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(30);
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

  test("hiding a grouped column keeps the groups", async ({ page }) => {
    await groupBy(page, "Filter");
    await expect(page.locator("td.bg-stone-900")).toHaveCount(5);

    await openColumnMenu(page, "Filter");
    await page.getByRole("menuitem", { name: "Hide Column" }).click();

    // Column header is gone but grouping still applies
    await expect(
      page.getByRole("columnheader").filter({ hasText: "Filter" }),
    ).toHaveCount(0);
    await expect(page.locator("td.bg-stone-900")).toHaveCount(5);
    await expect(page.getByText(/Filter: y_10 \(6\)/)).toBeVisible();
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

  test("filtering then grouping only groups filtered rows", async ({
    page,
  }) => {
    await applyFilter(page, "Filter", "y_10");
    // Group by the same column we filtered — only 1 group should appear
    await groupBy(page, "Filter");
    await expect(page.locator("td.bg-stone-900")).toHaveCount(1);
    await expect(page.getByText(/Filter: y_10 \(6\)/)).toBeVisible();
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
