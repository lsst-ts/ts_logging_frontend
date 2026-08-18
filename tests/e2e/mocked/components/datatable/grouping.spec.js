// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../../helpers/mock-api.js";
import {
  DATATABLE_PAGES,
  tableRows,
  groupHeaderCells,
  openColumnMenu,
  groupByColumn,
  applyColumnFilter,
} from "../../../helpers/datatable-pages.js";

for (const {
  name,
  url,
  waitForLoad,
  mocks,
  rowCount,
  group,
  filter,
} of DATATABLE_PAGES) {
  test.describe(`${name} — DataTable: grouping`, () => {
    test.beforeEach(async ({ page }) => {
      await setupApiMocks(page, mocks);
      await page.goto(url);
      await waitForLoad(page);
    });

    test("grouping collapses the rows into group headers", async ({ page }) => {
      await groupByColumn(page, group.column);

      await expect(tableRows(page)).toHaveCount(group.groupCount);
      await expect(groupHeaderCells(page)).toHaveCount(group.groupCount);
    });

    test("a group header shows its column, value and row count", async ({
      page,
    }) => {
      await groupByColumn(page, group.column);
      await expect(page.getByText(group.headerPattern)).toBeVisible();
    });

    test("Expand All Groups reveals every row, Collapse All hides them", async ({
      page,
    }) => {
      await groupByColumn(page, group.column);

      await page.getByRole("button", { name: "Expand All Groups" }).click();
      await expect(tableRows(page)).toHaveCount(group.groupCount + rowCount);

      await page.getByRole("button", { name: "Collapse All Groups" }).click();
      await expect(tableRows(page)).toHaveCount(group.groupCount);
    });

    test("the group toggle is disabled until the table is grouped", async ({
      page,
    }) => {
      // With no groups, allExpanded is vacuously true, so the button reads
      // "Collapse All Groups" while disabled.
      await expect(
        page.getByRole("button", { name: "Collapse All Groups" }),
      ).toBeDisabled();

      await groupByColumn(page, group.column);
      await expect(
        page.getByRole("button", { name: "Expand All Groups" }),
      ).toBeEnabled();
    });

    test("clicking one group header expands then collapses that group", async ({
      page,
    }) => {
      await groupByColumn(page, group.column);
      await tableRows(page).first().click();
      await expect(tableRows(page)).not.toHaveCount(group.groupCount);

      await tableRows(page).first().click();
      await expect(tableRows(page)).toHaveCount(group.groupCount);
    });

    test("Ungroup from the column menu restores the flat rows", async ({
      page,
    }) => {
      await groupByColumn(page, group.column);
      await expect(tableRows(page)).toHaveCount(group.groupCount);

      await openColumnMenu(page, group.column);
      await page.getByRole("menuitem", { name: "Ungroup" }).click();

      await expect(groupHeaderCells(page)).toHaveCount(0);
      await expect(tableRows(page)).toHaveCount(rowCount);
    });

    test("hiding the grouped column keeps the groups", async ({ page }) => {
      await groupByColumn(page, group.column);
      await expect(tableRows(page)).toHaveCount(group.groupCount);

      await openColumnMenu(page, group.column);
      await page.getByRole("menuitem", { name: "Hide Column" }).click();

      await expect(groupHeaderCells(page)).toHaveCount(group.groupCount);
    });

    test("filtering first groups only the matching rows", async ({ page }) => {
      await applyColumnFilter(page, filter.column, filter.single.value);
      await expect(tableRows(page)).toHaveCount(filter.single.rows);

      await groupByColumn(page, group.column);
      await page.getByRole("button", { name: "Expand All Groups" }).click();

      // Group headers plus only the rows that survived the filter.
      const groups = await groupHeaderCells(page).count();
      await expect(tableRows(page)).toHaveCount(groups + filter.single.rows);
    });
  });
}
