// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../../helpers/mock-api.js";
import {
  DATATABLE_PAGES,
  columnHeader,
  openColumnMenu,
  tableRows,
} from "../../../helpers/datatable-pages.js";
import { downloadCsv } from "../../../helpers/download-helpers.js";

for (const {
  name,
  url,
  waitForLoad,
  mocks,
  rowCount,
  sort,
  visibility,
  download,
} of DATATABLE_PAGES) {
  test.describe(`${name} — DataTable: download`, () => {
    test.beforeEach(async ({ page }) => {
      await setupApiMocks(page, mocks);
    });

    test("downloads the visible columns as displayed text", async ({
      page,
    }) => {
      await page.goto(url);
      await waitForLoad(page);

      await openColumnMenu(page, visibility.visible);
      await page.getByRole("menuitem", { name: "Hide Column" }).click();
      await expect(columnHeader(page, visibility.visible)).toHaveCount(0);

      const { filename, headers, rows } = await downloadCsv(page);

      expect(filename).toBe(
        `nightlydigest_${name}_Simonyi_20260101-20260101.csv`,
      );
      expect(headers).toContain(sort.defaultColumn);
      expect(headers).not.toContain(visibility.visible);
      expect(headers).not.toContain(visibility.hiddenByDefault);
      if (download.displayOnlyHeader) {
        expect(headers).toContain(download.displayOnlyHeader);
      }
      // Values are the text the table shows, e.g. formatted timestamps.
      expect(rows.map((row) => row[sort.defaultColumn])).toContain(
        sort.defaultFirst,
      );
    });

    test("downloads every loaded row, ignoring the selected time range", async ({
      page,
    }) => {
      const { startTime, endTime } = download.window;
      await page.goto(`${url}&startTime=${startTime}&endTime=${endTime}`);
      await waitForLoad(page);

      const shownRows = await tableRows(page).count();
      expect(shownRows).toBeGreaterThan(0);
      expect(shownRows).toBeLessThan(rowCount);

      const { rows } = await downloadCsv(page);

      expect(rows).toHaveLength(download.rows);
    });
  });
}
