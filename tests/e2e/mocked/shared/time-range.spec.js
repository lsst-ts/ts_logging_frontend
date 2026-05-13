// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import { waitForPlotsLoad } from "../../helpers/plots-helpers.js";
import { waitForDataLogLoad } from "../../helpers/datalog-helpers.js";
import {
  PLOTS_URL,
  DATALOG_URL,
  FULL_START,
  FULL_END,
} from "../../helpers/constants.js";

/** Format a UTC millisecond timestamp as "H:mm  yyyy-LL-dd" (the EditableDateTimeInput format). */
function fmtMs(ms) {
  const d = new Date(ms);
  const z = (n) => String(n).padStart(2, "0");
  return `${d.getUTCHours()}:${z(d.getUTCMinutes())}  ${d.getUTCFullYear()}-${z(
    d.getUTCMonth() + 1,
  )}-${z(d.getUTCDate())}`;
}

const PAGES = [
  { name: "plots", url: PLOTS_URL, waitForLoad: waitForPlotsLoad },
  { name: "data-log", url: DATALOG_URL, waitForLoad: waitForDataLogLoad },
];

for (const { name, url, waitForLoad } of PAGES) {
  // ---------------------------------------------------------------------------

  test.describe(`${name} — Time range synchronisation`, () => {
    test.beforeEach(async ({ page }) => {
      await setupApiMocks(page);
      await page.goto(url);
      await waitForLoad(page);
    });

    test("page loaded with startTime/endTime in URL reflects them in the bar immediately", async ({
      page,
    }) => {
      // Use clean round-hour offsets so expected strings are exact.
      // FULL_START = 2026-01-01T12:00:00Z; +6 h = 18:00 Jan 1; +18 h = 06:00 Jan 2.
      const START = FULL_START + 6 * 3600 * 1000;
      const END = FULL_START + 18 * 3600 * 1000;

      await setupApiMocks(page);
      await page.goto(`${url}&startTime=${START}&endTime=${END}`);
      await waitForLoad(page);

      const bar = page
        .locator("[data-slot='card']")
        .filter({ hasText: "Selected Time Range" });
      await expect(bar.locator("input[type='text']").first()).toHaveValue(
        "18:00  2026-01-01",
      );
      await expect(bar.locator("input[type='text']").last()).toHaveValue(
        "6:00  2026-01-02",
      );
    });

    test("editing the end time input updates the URL", async ({ page }) => {
      const bar = page
        .locator("[data-slot='card']")
        .filter({ hasText: "Selected Time Range" });
      const endInput = bar.locator("input[type='text']").last();

      await endInput.fill("00:09  2026-01-02");
      await endInput.press("Enter");

      // 2026-01-02T00:09:00Z = 1767312000000 + 540000 = 1767312540000
      await expect(page).toHaveURL(/startTime=1767268800000/);
      await expect(page).toHaveURL(/endTime=1767312540000/);
    });

    test("dragging on the timeline updates the time range input bar", async ({
      page,
    }) => {
      const timelineSvg = page.locator(".recharts-surface").first();
      await timelineSvg.scrollIntoViewIfNeeded();
      await expect(timelineSvg).toBeVisible();

      const svgBox = await timelineSvg.boundingBox();
      const plotBounds = await timelineSvg.evaluate((svg) => {
        const clip = svg.querySelector("clipPath rect");
        return {
          x: parseFloat(clip.getAttribute("x")),
          y: parseFloat(clip.getAttribute("y")),
          width: parseFloat(clip.getAttribute("width")),
          height: parseFloat(clip.getAttribute("height")),
        };
      });

      const startX = svgBox.x + plotBounds.x + plotBounds.width * 0.2;
      const endX = svgBox.x + plotBounds.x + plotBounds.width * 0.6;
      const y = svgBox.y + plotBounds.y + plotBounds.height / 2;

      const range = FULL_END - FULL_START;
      const expectedStartValue = fmtMs(Math.round(FULL_START + 0.2 * range));
      const expectedEndValue = fmtMs(Math.round(FULL_START + 0.6 * range));

      await page.mouse.move(startX, y);
      await page.mouse.down();
      await page.mouse.move(endX, y);
      await page.mouse.up();

      const bar = page
        .locator("[data-slot='card']")
        .filter({ hasText: "Selected Time Range" });
      await expect(bar.locator("input[type='text']").first()).toHaveValue(
        expectedStartValue,
      );
      await expect(bar.locator("input[type='text']").last()).toHaveValue(
        expectedEndValue,
      );
    });
  });

  // ---------------------------------------------------------------------------

  test.describe(`${name} — Selected time range bar`, () => {
    test.beforeEach(async ({ page }) => {
      await setupApiMocks(page);
      await page.goto(url);
      await waitForLoad(page);
    });

    test("shows the label and default start/end inputs", async ({ page }) => {
      await expect(page.getByText("Selected Time Range (TAI):")).toBeVisible();
      const bar = page
        .locator("[data-slot='card']")
        .filter({ hasText: "Selected Time Range" });
      await expect(bar.locator("input[type='text']").first()).toHaveValue(
        "12:00  2026-01-01",
      );
      await expect(bar.locator("input[type='text']").last()).toHaveValue(
        "11:59  2026-01-02",
      );
    });

    test("shows 30 of 30 exposures selected with full time range", async ({
      page,
    }) => {
      await expect(page.getByText("30 of 30 exposures selected")).toBeVisible();
    });

    test("narrowing the end time reduces the exposure count", async ({
      page,
    }) => {
      const bar = page
        .locator("[data-slot='card']")
        .filter({ hasText: "Selected Time Range" });
      const endInput = bar.locator("input[type='text']").last();
      await endInput.fill("00:09  2026-01-02");
      await endInput.press("Enter");
      await expect(page.getByText("10 of 30 exposures selected")).toBeVisible();
    });
  });
}
