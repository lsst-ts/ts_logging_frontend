// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../../helpers/mock-api.js";
import {
  DATATABLE_PAGES,
  tableRows,
  columnHeader,
  openColumnMenu,
  cellByHeader,
} from "../../../helpers/datatable-pages.js";

for (const { name, url, waitForLoad, mocks, sort } of DATATABLE_PAGES) {
  test.describe(`${name} — DataTable: sorting is case-insensitive`, () => {
    // Guards the sortFns registry in tableFeatures.js. v9 defaults every column
    // to sortFn "auto" and resolves the choice through that registry, so
    // without it these orderings quietly become case-sensitive.
    test("a mixed-case string column sorts without regard to case", async ({
      page,
    }) => {
      const { column, mocks: caseMocks, expectedOrder } = sort.caseInsensitive;

      await setupApiMocks(page, caseMocks);
      await page.goto(url);
      await waitForLoad(page);

      await openColumnMenu(page, column);
      await page.getByText("Sort by asc.").click();

      const actual = [];
      for (let i = 0; i < expectedOrder.length; i++) {
        actual.push(
          (await (await cellByHeader(page, i, column)).innerText()).trim(),
        );
      }
      expect(actual).toEqual(expectedOrder);
    });
  });

  test.describe(`${name} — DataTable: sorting`, () => {
    test.beforeEach(async ({ page }) => {
      await setupApiMocks(page, mocks);
      await page.goto(url);
      await waitForLoad(page);
    });

    test("the default sort orders rows and marks its column", async ({
      page,
    }) => {
      await expect(tableRows(page).first()).toContainText(sort.defaultFirst);
      await expect(tableRows(page).last()).toContainText(sort.defaultLast);
      await expect(columnHeader(page, sort.defaultColumn)).toContainText("🔼");
    });

    test("sorting descending reverses the rows and flips the indicator", async ({
      page,
    }) => {
      await openColumnMenu(page, sort.defaultColumn);
      await page.getByText("Sort by desc.").click();

      await expect(columnHeader(page, sort.defaultColumn)).toContainText("🔽");
      await expect(tableRows(page).first()).toContainText(sort.defaultLast);
      await expect(tableRows(page).last()).toContainText(sort.defaultFirst);
    });

    test("the sort menu label cycles asc, desc, unsort", async ({ page }) => {
      // The default column starts sorted ascending.
      await openColumnMenu(page, sort.defaultColumn);
      await expect(page.getByText("Sort by desc.")).toBeVisible();
      await page.getByText("Sort by desc.").click();

      await openColumnMenu(page, sort.defaultColumn);
      await expect(page.getByText("Unsort")).toBeVisible();
      await page.getByText("Unsort").click();

      await openColumnMenu(page, sort.defaultColumn);
      await expect(page.getByText("Sort by asc.")).toBeVisible();
    });

    test("an unsorted column cycles asc, desc, unsort", async ({ page }) => {
      await openColumnMenu(page, sort.unsortedColumn);
      await expect(page.getByText("Sort by asc.")).toBeVisible();
      await page.getByText("Sort by asc.").click();
      await expect(columnHeader(page, sort.unsortedColumn)).toContainText("🔼");

      await openColumnMenu(page, sort.unsortedColumn);
      await page.getByText("Sort by desc.").click();
      await expect(columnHeader(page, sort.unsortedColumn)).toContainText("🔽");

      await openColumnMenu(page, sort.unsortedColumn);
      await page.getByText("Unsort").click();
      await expect(columnHeader(page, sort.unsortedColumn)).not.toContainText(
        "🔽",
      );
    });

    test("Unsort removes the indicator from the column", async ({ page }) => {
      await openColumnMenu(page, sort.defaultColumn);
      await page.getByText("Sort by desc.").click();
      await openColumnMenu(page, sort.defaultColumn);
      await page.getByText("Unsort").click();

      await expect(columnHeader(page, sort.defaultColumn)).not.toContainText(
        "🔼",
      );
      await expect(columnHeader(page, sort.defaultColumn)).not.toContainText(
        "🔽",
      );
    });
  });
}
