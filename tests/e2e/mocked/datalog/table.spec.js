// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import {
  waitForDataLogLoad,
  getDataLogUrl,
} from "../../helpers/datalog-helpers.js";

const DATALOG_URL = getDataLogUrl();

test.describe("Data-log page — table content and formatting", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await page.goto(DATALOG_URL);
    await waitForDataLogLoad(page);
  });

  test("exposure counter shows 30 of 30", async ({ page }) => {
    await expect(page.getByText("30 of 30 exposures selected")).toBeVisible({
      timeout: 10000,
    });
  });

  test("RubinTV column shows 'Post-ISR Mosaic' link pointing to rubintv", async ({
    page,
  }) => {
    const link = page.getByRole("link", { name: "Post-ISR Mosaic" }).first();
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", /rubintv/);
    await expect(link).toHaveAttribute("href", /2026-01-01/);
  });

  test("first row cell values are formatted correctly", async ({ page }) => {
    const firstRow = page.locator("[data-slot='table-body'] tr").first();
    // exposure_id (integer ≥ 100) → no decimals
    await expect(firstRow).toContainText("20260101000001");
    // physical_filter → string passthrough
    await expect(firstRow).toContainText("y_10");
    // airmass = 1.3 → inferDecimals → 2 → "1.30"
    await expect(firstRow).toContainText("1.30");
    // img_type not in mock → undefined → "na"
    await expect(firstRow).toContainText("na");
  });

  test("column header tooltip appears on hover", async ({ page }) => {
    const airmassHeader = page
      .getByRole("columnheader")
      .filter({ hasText: "Airmass" });
    await airmassHeader.locator("span.cursor-help").hover();
    await expect(
      page.getByText("Airmass of the observed line of sight"),
    ).toBeVisible();
  });

  test("correct columns are visible by default for Simonyi", async ({
    page,
  }) => {
    const visibleColumns = [
      "Exposure Id",
      "Science Program",
      "Airmass",
      "Filter",
      "Photometric ZP",
    ];
    for (const col of visibleColumns) {
      await expect(
        page.getByRole("columnheader").filter({ hasText: col }),
      ).toBeVisible();
    }
    // These are hidden by default
    const hiddenColumns = ["Seq Num", "Exposure Name", "Day Obs"];
    for (const col of hiddenColumns) {
      await expect(
        page.getByRole("columnheader").filter({ hasText: col }),
      ).toHaveCount(0);
    }
  });

  test("columns can be resized by dragging the resize handle", async ({
    page,
  }) => {
    // Use Exposure Id (size: 140, early in table) — less likely to have overlap issues
    const header = page
      .getByRole("columnheader")
      .filter({ hasText: "Exposure Id" });
    const headerBox = await header.boundingBox();

    // The resize handle is absolute right-0, 12px wide — position at the right edge
    const dragX = headerBox.x + headerBox.width - 4;
    const dragY = headerBox.y + headerBox.height / 2;

    await page.mouse.move(dragX, dragY);
    await page.mouse.down();
    await page.mouse.move(dragX + 80, dragY);
    await page.mouse.up();

    // Wait for React re-render after resize
    const newHeaderBox = await header.boundingBox();
    expect(newHeaderBox.width).toBeGreaterThan(headerBox.width);
  });

  test("rows highlight on hover", async ({ page }) => {
    const row = page
      .locator("[data-slot='table-body'] [data-slot='table-row']")
      .first();
    // Move mouse away first to get the un-hovered background
    await page.mouse.move(0, 0);
    const bgBefore = await row.evaluate(
      (el) => window.getComputedStyle(el).backgroundColor,
    );
    await row.hover();
    const bgAfter = await row.evaluate(
      (el) => window.getComputedStyle(el).backgroundColor,
    );
    expect(bgAfter).not.toBe(bgBefore);
  });
});
