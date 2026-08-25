// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../../helpers/mock-api.js";
import {
  DATATABLE_PAGES,
  columnHeader,
  openColumnMenu,
} from "../../../helpers/datatable-pages.js";

for (const {
  name,
  url,
  waitForLoad,
  mocks,
  filter,
  tooltip,
  singleValue,
  emptyMocks,
} of DATATABLE_PAGES) {
  test.describe(`${name} — DataTable: column header menu`, () => {
    test("a column tooltip appears on hover", async ({ page }) => {
      await setupApiMocks(page, mocks);
      await page.goto(url);
      await waitForLoad(page);

      await columnHeader(page, tooltip.column)
        .locator("span.cursor-help")
        .hover();
      await expect(page.getByText(tooltip.text)).toBeVisible();
    });

    test("a column with several unique values offers a filter section", async ({
      page,
    }) => {
      await setupApiMocks(page, mocks);
      await page.goto(url);
      await waitForLoad(page);

      await openColumnMenu(page, filter.column);
      await expect(page.getByRole("menu").getByText("Filter:")).toBeVisible();
    });

    test("a column with one unique value offers no filter section", async ({
      page,
    }) => {
      // DataTableHeader only renders the filter when the column has more than
      // one faceted unique value.
      await setupApiMocks(page, singleValue.mocks);
      await page.goto(url);
      await waitForLoad(page);

      await openColumnMenu(page, singleValue.column);
      const menu = page.getByRole("menu");
      await expect(menu.getByText("Sort by asc.")).toBeVisible();
      await expect(menu.getByText("Filter:")).toHaveCount(0);
    });

    test("the menu still opens on an empty table", async ({ page }) => {
      await setupApiMocks(page, emptyMocks);
      await page.goto(url);
      await waitForLoad(page);

      await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(0);

      await openColumnMenu(page, filter.column);
      const menu = page.getByRole("menu");
      await expect(menu.getByText("Sort by asc.")).toBeVisible();
      await expect(menu.getByText("Group by", { exact: true })).toBeVisible();
    });
  });
}
