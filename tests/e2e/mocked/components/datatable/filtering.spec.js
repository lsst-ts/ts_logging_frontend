// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../../helpers/mock-api.js";
import {
  DATATABLE_PAGES,
  tableRows,
  openColumnMenu,
  applyColumnFilter,
  clearColumnFilter,
} from "../../../helpers/datatable-pages.js";

for (const {
  name,
  url,
  waitForLoad,
  mocks,
  rowCount,
  filter,
} of DATATABLE_PAGES) {
  test.describe(`${name} — DataTable: column filtering`, () => {
    test.beforeEach(async ({ page }) => {
      await setupApiMocks(page, mocks);
      await page.goto(url);
      await waitForLoad(page);
    });

    test("filtering by one value narrows the rows", async ({ page }) => {
      await applyColumnFilter(page, filter.column, filter.single.value);
      await expect(tableRows(page)).toHaveCount(filter.single.rows);
    });

    test("filtering by several values matches any of them", async ({
      page,
    }) => {
      await applyColumnFilter(page, filter.column, filter.multi.values);
      await expect(tableRows(page)).toHaveCount(filter.multi.rows);
    });

    test("Clear removes the filter", async ({ page }) => {
      await applyColumnFilter(page, filter.column, filter.single.value);
      await expect(tableRows(page)).toHaveCount(filter.single.rows);

      await clearColumnFilter(page, filter.column);
      await expect(tableRows(page)).toHaveCount(rowCount);
    });

    test("unchecking a value drops it from the filter", async ({ page }) => {
      await applyColumnFilter(page, filter.column, filter.multi.values);
      await expect(tableRows(page)).toHaveCount(filter.multi.rows);

      // Re-open and untick the first of the two, leaving the second.
      await applyColumnFilter(page, filter.column, filter.multi.values[0]);
      await expect(tableRows(page)).toHaveCount(
        filter.multi.rows - filter.single.rows,
      );
    });

    test("the filter list is sorted alphabetically", async ({ page }) => {
      await openColumnMenu(page, filter.column);
      const labels = await page
        .getByRole("menu")
        .locator("label")
        .allInnerTexts();
      expect(labels).toEqual(filter.sortedValues);
    });

    test("applying a filter writes it to the URL", async ({ page }) => {
      test.skip(!filter.urlParam, "column filter is table-only");

      await applyColumnFilter(page, filter.column, filter.single.value);
      await expect(page).toHaveURL(
        new RegExp(`${filter.urlParam}=${filter.single.value}`),
      );
    });

    test("a filter in the URL is applied on load", async ({ page }) => {
      test.skip(!filter.urlParam, "column filter is table-only");

      await page.goto(
        `${url}&${filter.urlParam}=${encodeURIComponent(filter.single.value)}`,
      );
      await waitForLoad(page);
      await expect(tableRows(page)).toHaveCount(filter.single.rows);
    });

    test("a table-only filter stays out of the URL", async ({ page }) => {
      test.skip(!!filter.urlParam, "column filter is URL-synced");

      await applyColumnFilter(page, filter.column, filter.single.value);
      await expect(tableRows(page)).toHaveCount(filter.single.rows);
      expect(page.url()).not.toContain(filter.single.value);
    });
  });
}
