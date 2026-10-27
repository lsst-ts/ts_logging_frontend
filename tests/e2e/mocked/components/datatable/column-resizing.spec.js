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
 * The handle is a `.cursor-col-resize` element positioned at the right edge of
 * the header's content box. Target that element directly rather than guessing
 * a coordinate from the header's outer bounding box.
 */
async function dragResizeHandle(page, header, dx) {
  const handle = header.locator(".cursor-col-resize");
  await handle.scrollIntoViewIfNeeded();
  const box = await handle.boundingBox();
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;

  const before = await header.boundingBox();
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y);
  await page.mouse.up();

  return before;
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
      // Grow the column first, then drag well past the minimum. The width
      // should clamp back at (or below) its original size — i.e. much
      // narrower than the grown width and no wider than it started.
      const header = columnHeader(page, resizeColumn);
      const original = await dragResizeHandle(page, header, 60);

      const grown = await header.boundingBox();
      expect(grown.width).toBeGreaterThan(original.width);

      await dragResizeHandle(page, header, -200);

      const clamped = await header.boundingBox();
      expect(clamped.width).toBeLessThan(grown.width);
      expect(clamped.width).toBeLessThanOrEqual(original.width + 1);
    });
  });
}
