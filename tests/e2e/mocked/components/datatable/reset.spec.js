// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../../helpers/mock-api.js";
import {
  DATATABLE_PAGES,
  tableRows,
  groupHeaderCells,
  columnHeader,
  openColumnMenu,
  applyColumnFilter,
  groupByColumn,
} from "../../../helpers/datatable-pages.js";

// Reset Table runs DataTable's resetState() plus resetColumnSizing(), then the
// page's own onReset handler.
for (const {
  name,
  url,
  waitForLoad,
  mocks,
  rowCount,
  sort,
  filter,
  group,
  visibility,
  resizeColumn,
  emptyMocks,
} of DATATABLE_PAGES) {
  const reset = (page) =>
    page.getByRole("button", { name: "Reset Table" }).click();

  test.describe(`${name} — DataTable: Reset Table`, () => {
    test.beforeEach(async ({ page }) => {
      await setupApiMocks(page, mocks);
      await page.goto(url);
      await waitForLoad(page);
    });

    test("restores the default sort", async ({ page }) => {
      await openColumnMenu(page, sort.defaultColumn);
      await page.getByText("Sort by desc.").click();
      await expect(tableRows(page).first()).toContainText(sort.defaultLast);

      await reset(page);

      await expect(columnHeader(page, sort.defaultColumn)).toContainText("🔼");
      await expect(tableRows(page).first()).toContainText(sort.defaultFirst);
    });

    test("clears column filters", async ({ page }) => {
      await applyColumnFilter(page, filter.column, filter.single.value);
      await expect(tableRows(page)).toHaveCount(filter.single.rows);

      await reset(page);

      await expect(tableRows(page)).toHaveCount(rowCount);
      if (filter.urlParam) {
        await expect(page).not.toHaveURL(new RegExp(`${filter.urlParam}=`));
      }
    });

    test("clears grouping", async ({ page }) => {
      await groupByColumn(page, group.column);
      await expect(groupHeaderCells(page)).toHaveCount(group.groupCount);

      await reset(page);

      await expect(groupHeaderCells(page)).toHaveCount(0);
      await expect(tableRows(page)).toHaveCount(rowCount);
    });

    test("restores default column visibility", async ({ page }) => {
      await openColumnMenu(page, visibility.visible);
      await page.getByRole("menuitem", { name: "Hide Column" }).click();
      await expect(columnHeader(page, visibility.visible)).toHaveCount(0);

      await reset(page);

      await expect(columnHeader(page, visibility.visible)).toBeVisible();
      await expect(columnHeader(page, visibility.hiddenByDefault)).toHaveCount(
        0,
      );
    });

    test("restores column widths after a resize", async ({ page }) => {
      const header = columnHeader(page, resizeColumn);
      // The Context Feed table starts below the fold; without this the drag
      // coordinates fall outside the viewport.
      await header.scrollIntoViewIfNeeded();
      const original = await header.boundingBox();

      const x = original.x + original.width - 4;
      const y = original.y + original.height / 2;
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x + 80, y);
      await page.mouse.up();

      expect((await header.boundingBox()).width).toBeGreaterThan(
        original.width,
      );

      await reset(page);

      await expect(async () => {
        const after = await header.boundingBox();
        expect(Math.abs(after.width - original.width)).toBeLessThan(2);
      }).toPass();
    });

    test("does not break on an empty table", async ({ page }) => {
      await setupApiMocks(page, emptyMocks);
      await page.goto(url);
      await waitForLoad(page);

      await reset(page);

      await expect(tableRows(page)).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: "Reset Table" }),
      ).toBeVisible();
    });
  });
}
