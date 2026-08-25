// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../../helpers/mock-api.js";
import {
  DATATABLE_PAGES,
  tableRows,
  cellByHeader,
} from "../../../helpers/datatable-pages.js";

// Both pages resolve BLOCK names through the lookup handed to the table as
// meta.blockLookup, and render the resolved ones as Zephyr/Jira links.
for (const { name, url, waitForLoad, blocks } of DATATABLE_PAGES) {
  test.describe(`${name} — DataTable: BLOCK links`, () => {
    test("a resolved BLOCK renders as a link to its url", async ({ page }) => {
      await setupApiMocks(page, blocks.mocks);
      await page.goto(url);
      await waitForLoad(page);

      const link = tableRows(page)
        .nth(blocks.linked.rowIndex)
        .getByRole("link", { name: blocks.linked.value });

      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("href", blocks.linked.url);
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", /noopener/);
    });

    test("the lookup summary is shown in the description column", async ({
      page,
    }) => {
      await setupApiMocks(page, blocks.mocks);
      await page.goto(url);
      await waitForLoad(page);

      const cell = await cellByHeader(
        page,
        blocks.linked.rowIndex,
        blocks.summaryColumn,
      );
      await expect(cell).toContainText(blocks.linked.summary);
    });

    test("an unresolved BLOCK stays plain text", async ({ page }) => {
      await setupApiMocks(page, blocks.mocks);
      await page.goto(url);
      await waitForLoad(page);

      const row = tableRows(page).nth(blocks.unlinked.rowIndex);
      await expect(row).toContainText(blocks.unlinked.value);
      await expect(
        row.getByRole("link", { name: blocks.unlinked.value }),
      ).toHaveCount(0);

      // Each page has its own fallback for the summary cell.
      const cell = await cellByHeader(
        page,
        blocks.unlinked.rowIndex,
        blocks.summaryColumn,
      );
      await expect(cell).toHaveText(blocks.unlinked.summaryText);
    });

    test("one failed lookup source banners it and leaves the other working", async ({
      page,
    }) => {
      await setupApiMocks(page, blocks.partialMocks);
      await page.goto(url);
      await waitForLoad(page);

      await expect(page.getByText(/jira-blocks failed to load/)).toBeVisible({
        timeout: 10000,
      });
      await expect(page.getByText(/zephyr-blocks/)).toHaveCount(0);

      await expect(tableRows(page)).toHaveCount(blocks.rowCount);
      await expect(
        page.getByRole("link", { name: blocks.linked.value }).first(),
      ).toHaveAttribute("href", blocks.linked.url);
    });
  });
}
