// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import { waitForPlotsLoad } from "../../helpers/plots-helpers.js";
import { waitForDataLogLoad } from "../../helpers/data-log-helpers.js";
import {
  PLOTS_URL,
  DATA_LOG_URL,
  FULL_START,
  FULL_END,
} from "../../helpers/constants.js";

/** Format a UTC millisecond timestamp as "HH:mm  yyyy-LL-dd". */
function fmtMs(ms) {
  const d = new Date(ms);
  const z = (n) => String(n).padStart(2, "0");
  return `${z(d.getUTCHours())}:${z(
    d.getUTCMinutes(),
  )}  ${d.getUTCFullYear()}-${z(d.getUTCMonth() + 1)}-${z(d.getUTCDate())}`;
}

const PAGES = [
  {
    name: "Plots",
    url: PLOTS_URL,
    waitForLoad: waitForPlotsLoad,
  },
  {
    name: "DataLog",
    url: DATA_LOG_URL,
    waitForLoad: waitForDataLogLoad,
  },
  // TODO: add ContextFeed when its test infrastructure is ready
];

for (const { name, url, waitForLoad } of PAGES) {
  test.describe(`${name} page — time range bar URL sync`, () => {
    test("full range: inputs show FULL_START and FULL_END", async ({
      page,
    }) => {
      await setupApiMocks(page);
      await page.goto(url);
      await waitForLoad(page);

      const bar = page
        .locator("[data-slot='card']")
        .filter({ hasText: "Selected Time Range" });
      await expect(bar.locator("input[type='text']").first()).toHaveValue(
        fmtMs(FULL_START),
      );
      await expect(bar.locator("input[type='text']").last()).toHaveValue(
        fmtMs(FULL_END),
      );
    });

    test("startTime/endTime in URL reflected immediately in inputs", async ({
      page,
    }) => {
      // FULL_START = 2026-01-01T12:00:00Z; +6h = 18:00 Jan 1; +18h = 06:00 Jan 2
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
        "06:00  2026-01-02",
      );
    });
  });

  test.describe(`${name} page — time range bar input editing`, () => {
    test.beforeEach(async ({ page }) => {
      await setupApiMocks(page);
      await page.goto(url);
      await waitForLoad(page);
    });

    test("editing end time input updates endTime in URL", async ({ page }) => {
      const bar = page
        .locator("[data-slot='card']")
        .filter({ hasText: "Selected Time Range" });
      const endInput = bar.locator("input[type='text']").last();

      await endInput.fill("00:09  2026-01-02");
      await endInput.press("Enter");

      // 2026-01-02T00:09:00Z = 1767312000000 + 540000 = 1767312540000
      await expect(page).toHaveURL(/endTime=1767312540000/);
    });

    test("editing start time input updates startTime in URL", async ({
      page,
    }) => {
      const bar = page
        .locator("[data-slot='card']")
        .filter({ hasText: "Selected Time Range" });
      const startInput = bar.locator("input[type='text']").first();

      await startInput.fill("14:00  2026-01-01");
      await startInput.press("Enter");

      // 2026-01-01T14:00:00Z = 1767268800000 + 7200000 = 1767276000000
      await expect(page).toHaveURL(/startTime=1767276000000/);
    });
  });

  test.describe(`${name} page — exposure count`, () => {
    test.beforeEach(async ({ page }) => {
      await setupApiMocks(page);
      await page.goto(url);
      await waitForLoad(page);
    });

    test("full range shows '30 of 30 exposures selected'", async ({ page }) => {
      await expect(page.getByText("30 of 30 exposures selected")).toBeVisible();
    });

    test("narrowing end time reduces count below 30", async ({ page }) => {
      // Plots uses isoToUTC for obs_start_millis; DataLog uses isoToTAI (UTC+37s).
      // The same URL end time produces different exact counts on each page, so we
      // only assert the count decreases rather than checking an exact value.
      const bar = page
        .locator("[data-slot='card']")
        .filter({ hasText: "Selected Time Range" });
      const endInput = bar.locator("input[type='text']").last();

      // 00:05 UTC Jan 2 — ends before most exposures on both pages
      await endInput.fill("00:05  2026-01-02");
      await endInput.press("Enter");

      // Count text appears and is < 30
      const countText = await page
        .getByText(/\d+ of 30 exposures selected/)
        .textContent({ timeout: 5000 });
      expect(parseInt(countText)).toBeLessThan(30);
    });

    test("widening back to full range restores count", async ({ page }) => {
      const bar = page
        .locator("[data-slot='card']")
        .filter({ hasText: "Selected Time Range" });
      const endInput = bar.locator("input[type='text']").last();

      await endInput.fill("00:05  2026-01-02");
      await endInput.press("Enter");

      await endInput.fill(fmtMs(FULL_END));
      await endInput.press("Enter");
      await expect(page.getByText("30 of 30 exposures selected")).toBeVisible();
    });
  });

  test.describe(`${name} page — timeline drag`, () => {
    test.beforeEach(async ({ page }) => {
      await setupApiMocks(page);
      await page.goto(url);
      await waitForLoad(page);
    });

    test("drag selects a sub-range and bar inputs update", async ({ page }) => {
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
      const expectedStart = fmtMs(Math.round(FULL_START + 0.2 * range));
      const expectedEnd = fmtMs(Math.round(FULL_START + 0.6 * range));

      await page.mouse.move(startX, y);
      await page.mouse.down();
      await page.mouse.move(endX, y);
      await page.mouse.up();

      const bar = page
        .locator("[data-slot='card']")
        .filter({ hasText: "Selected Time Range" });
      await expect(bar.locator("input[type='text']").first()).toHaveValue(
        expectedStart,
      );
      await expect(bar.locator("input[type='text']").last()).toHaveValue(
        expectedEnd,
      );
    });

    test("drag reduces exposure count below 30", async ({ page }) => {
      // All 30 mock exposures start at 00:00–00:29 UTC Jan 2, which is ~50% through
      // the 24-h dayobs window. Dragging 0%–49% selects the pre-midnight period and
      // excludes all exposures on both Plots (UTC) and DataLog (TAI) pages.
      const timelineSvg = page.locator(".recharts-surface").first();
      await timelineSvg.scrollIntoViewIfNeeded();

      const svgBox = await timelineSvg.boundingBox();
      const plotBounds = await timelineSvg.evaluate((svg) => {
        const clip = svg.querySelector("clipPath rect");
        return {
          x: parseFloat(clip.getAttribute("x")),
          width: parseFloat(clip.getAttribute("width")),
          y: parseFloat(clip.getAttribute("y")),
          height: parseFloat(clip.getAttribute("height")),
        };
      });

      const startX = svgBox.x + plotBounds.x + plotBounds.width * 0.0;
      const endX = svgBox.x + plotBounds.x + plotBounds.width * 0.49;
      const y = svgBox.y + plotBounds.y + plotBounds.height / 2;

      await page.mouse.move(startX, y);
      await page.mouse.down();
      await page.mouse.move(endX, y);
      await page.mouse.up();

      const countText = await page
        .getByText(/\d+ of 30 exposures selected/)
        .textContent({ timeout: 5000 });
      expect(parseInt(countText)).toBeLessThan(30);
    });

    test("double-click resets to full range", async ({ page }) => {
      const timelineSvg = page.locator(".recharts-surface").first();
      await timelineSvg.scrollIntoViewIfNeeded();

      const svgBox = await timelineSvg.boundingBox();
      const plotBounds = await timelineSvg.evaluate((svg) => {
        const clip = svg.querySelector("clipPath rect");
        return {
          x: parseFloat(clip.getAttribute("x")),
          width: parseFloat(clip.getAttribute("width")),
          y: parseFloat(clip.getAttribute("y")),
          height: parseFloat(clip.getAttribute("height")),
        };
      });

      // First: drag to narrow the range
      const startX = svgBox.x + plotBounds.x + plotBounds.width * 0.2;
      const endX = svgBox.x + plotBounds.x + plotBounds.width * 0.6;
      const y = svgBox.y + plotBounds.y + plotBounds.height / 2;

      await page.mouse.move(startX, y);
      await page.mouse.down();
      await page.mouse.move(endX, y);
      await page.mouse.up();

      // Then: double-click to reset
      await page.mouse.dblclick(startX, y);

      const bar = page
        .locator("[data-slot='card']")
        .filter({ hasText: "Selected Time Range" });
      await expect(bar.locator("input[type='text']").first()).toHaveValue(
        fmtMs(FULL_START),
      );
      await expect(bar.locator("input[type='text']").last()).toHaveValue(
        fmtMs(FULL_END),
      );
    });
  });
}

// ---------------------------------------------------------------------------
// DataLog-only: exposure count in bar equals visible table rows
// ---------------------------------------------------------------------------

test.describe("DataLog page — count matches table row count", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await page.goto(DATA_LOG_URL);
    await waitForDataLogLoad(page);
  });

  test("after narrowing time range, bar count equals table row count", async ({
    page,
  }) => {
    const bar = page
      .locator("[data-slot='card']")
      .filter({ hasText: "Selected Time Range" });
    const endInput = bar.locator("input[type='text']").last();

    await endInput.fill("00:10  2026-01-02");
    await endInput.press("Enter");

    await expect(page.getByText("10 of 30 exposures selected")).toBeVisible();
    await expect(page.locator("tbody tr")).toHaveCount(10);
  });
});
