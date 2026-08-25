// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../../helpers/mock-api.js";
import {
  DATATABLE_PAGES,
  columnHeader,
  openColumnMenu,
} from "../../../helpers/datatable-pages.js";

/**
 * Clicks a column's checkbox in the Show / Hide Columns popover.
 * The shadcn Checkbox has no label association, so find the row by its text.
 */
async function toggleInPopover(page, columnName) {
  await page
    .locator("[data-slot='popover-content'] div.flex.items-center")
    .filter({ hasText: columnName })
    .locator("[data-slot='checkbox']")
    .click();
}

for (const { name, url, waitForLoad, mocks, visibility } of DATATABLE_PAGES) {
  test.describe(`${name} — DataTable: column visibility`, () => {
    test.beforeEach(async ({ page }) => {
      await setupApiMocks(page, mocks);
      await page.goto(url);
      await waitForLoad(page);
    });

    test("the popover lists visible and hidden columns", async ({ page }) => {
      await page.getByRole("button", { name: "Show / Hide Columns" }).click();

      await expect(
        page.getByRole("button", { name: "Select All", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Deselect All" }),
      ).toBeVisible();

      const popover = page.locator("[data-slot='popover-content']");
      await expect(popover.getByText(visibility.visible)).toBeVisible();
      await expect(popover.getByText(visibility.hiddenByDefault)).toBeVisible();
    });

    test("unticking a column removes it from the header", async ({ page }) => {
      await expect(columnHeader(page, visibility.visible)).toBeVisible();

      await page.getByRole("button", { name: "Show / Hide Columns" }).click();
      await toggleInPopover(page, visibility.visible);

      await expect(columnHeader(page, visibility.visible)).toHaveCount(0);
    });

    test("ticking a default-hidden column adds it to the header", async ({
      page,
    }) => {
      await expect(columnHeader(page, visibility.hiddenByDefault)).toHaveCount(
        0,
      );

      await page.getByRole("button", { name: "Show / Hide Columns" }).click();
      await toggleInPopover(page, visibility.hiddenByDefault);

      await expect(
        columnHeader(page, visibility.hiddenByDefault),
      ).toBeVisible();
    });

    test("Hide Column in the header menu hides that column", async ({
      page,
    }) => {
      await expect(columnHeader(page, visibility.visible)).toBeVisible();

      await openColumnMenu(page, visibility.visible);
      await page.getByRole("menuitem", { name: "Hide Column" }).click();

      await expect(columnHeader(page, visibility.visible)).toHaveCount(0);
    });

    test("Deselect All hides every column", async ({ page }) => {
      await page.getByRole("button", { name: "Show / Hide Columns" }).click();
      await page.getByRole("button", { name: "Deselect All" }).click();

      await expect(page.locator("[data-slot='table'] th")).toHaveCount(0);
    });

    test("Select All shows every column again", async ({ page }) => {
      await page.getByRole("button", { name: "Show / Hide Columns" }).click();
      await toggleInPopover(page, visibility.visible);
      await expect(columnHeader(page, visibility.visible)).toHaveCount(0);

      await page
        .getByRole("button", { name: "Select All", exact: true })
        .click();
      await expect(columnHeader(page, visibility.visible)).toBeVisible();
    });
  });
}
