// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../../helpers/mock-api.js";
import {
  DATATABLE_PAGES,
  cellByHeader,
} from "../../../helpers/datatable-pages.js";

// Row selection is driven by the column carrying meta.selectedKey, and synced
// to the URL by useSelectionSync. Both pages do this with a different key and
// param name.
for (const { name, url, waitForLoad, mocks, selection } of DATATABLE_PAGES) {
  test.describe(`${name} — DataTable: row selection`, () => {
    test.beforeEach(async ({ page }) => {
      await setupApiMocks(page, mocks);
      await page.goto(url);
      await waitForLoad(page);
    });

    const selectedRow = (page) => page.locator("tr[data-selected='true']");

    test("nothing is selected on load", async ({ page }) => {
      await expect(selectedRow(page)).toHaveCount(0);
      expect(page.url()).not.toContain(selection.urlParam);
    });

    test("clicking a row selects it and writes the URL param", async ({
      page,
    }) => {
      await (await cellByHeader(page, 0, selection.clickColumn)).click();

      await expect(selectedRow(page)).toHaveCount(1);
      await expect(selectedRow(page)).toContainText(selection.firstRowText);
      expect(page.url()).toContain(
        `${selection.urlParam}=${selection.firstRowValue}`,
      );
    });

    test("clicking the selected row again deselects it", async ({ page }) => {
      const cell = await cellByHeader(page, 0, selection.clickColumn);
      await cell.click();
      await expect(selectedRow(page)).toHaveCount(1);

      await cell.click();
      await expect(selectedRow(page)).toHaveCount(0);
      expect(page.url()).not.toContain(selection.urlParam);
    });

    test("selecting another row moves the selection", async ({ page }) => {
      await (await cellByHeader(page, 0, selection.clickColumn)).click();
      await (await cellByHeader(page, 1, selection.clickColumn)).click();

      await expect(selectedRow(page)).toHaveCount(1);
      await expect(selectedRow(page)).toContainText(selection.secondRowText);
    });

    test("the URL param pre-selects the matching row on load", async ({
      page,
    }) => {
      await page.goto(
        `${url}&${selection.urlParam}=${selection.firstRowValue}`,
      );
      await waitForLoad(page);

      await expect(selectedRow(page)).toHaveCount(1);
      await expect(selectedRow(page)).toContainText(selection.firstRowText);
    });
  });
}
