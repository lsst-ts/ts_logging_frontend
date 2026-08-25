// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../../helpers/mock-api.js";
import {
  DATATABLE_PAGES,
  columnHeader,
} from "../../../helpers/datatable-pages.js";

/**
 * Drags a column's resize handle by `dx` pixels.
 *
 * The handle is absolutely positioned at the header's right edge and is 12px
 * wide, so grab it a few pixels inside that edge.
 */
async function dragResizeHandle(page, header, dx) {
  // The Context Feed table sits below two chart cards, so its header starts
  // outside the viewport and mouse coordinates would miss it.
  await header.scrollIntoViewIfNeeded();
  const box = await header.boundingBox();
  const x = box.x + box.width - 4;
  const y = box.y + box.height / 2;

  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y);
  await page.mouse.up();

  return box;
}

for (const { name, url, waitForLoad, mocks, resizeColumn } of DATATABLE_PAGES) {
  test.describe(`${name} — DataTable: column resizing`, () => {
    test.beforeEach(async ({ page }) => {
      await setupApiMocks(page, mocks);
      await page.goto(url);
      await waitForLoad(page);
    });

    test("dragging the resize handle widens the column", async ({ page }) => {
      const header = columnHeader(page, resizeColumn);
      const before = await dragResizeHandle(page, header, 80);

      const after = await header.boundingBox();
      expect(after.width).toBeGreaterThan(before.width);
    });

    test("dragging below minSize clamps at the minimum", async ({ page }) => {
      // The profile picks a column whose size equals its minSize, so grow it
      // first and then drag well past the minimum.
      const header = columnHeader(page, resizeColumn);
      const original = await dragResizeHandle(page, header, 60);

      const grown = await header.boundingBox();
      expect(grown.width).toBeGreaterThan(original.width);

      await dragResizeHandle(page, header, -200);

      const clamped = await header.boundingBox();
      expect(Math.abs(clamped.width - original.width)).toBeLessThan(2);
    });
  });
}
