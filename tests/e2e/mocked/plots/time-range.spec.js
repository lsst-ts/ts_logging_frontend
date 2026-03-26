// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import { waitForPlotsLoad } from "../../helpers/plots-helpers.js";
import { PLOTS_URL, FULL_START, FULL_END } from "../../helpers/constants.js";

/** Format a UTC millisecond timestamp as "HH:mm  yyyy-LL-dd" (the EditableDateTimeInput format). */
function fmtMs(ms) {
  const d = new Date(ms);
  const z = (n) => String(n).padStart(2, "0");
  return `${z(d.getUTCHours())}:${z(
    d.getUTCMinutes(),
  )}  ${d.getUTCFullYear()}-${z(d.getUTCMonth() + 1)}-${z(d.getUTCDate())}`;
}

// ---------------------------------------------------------------------------

test.describe("Time range synchronisation", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await page.goto(PLOTS_URL);
    await waitForPlotsLoad(page);
  });

  test("editing the end time input updates the URL", async ({ page }) => {
    const bar = page
      .locator("[data-slot='card']")
      .filter({ hasText: "Selected Time Range" });
    const endInput = bar.locator("input[type='text']").last();

    await endInput.fill("00:09  2026-01-02");
    await endInput.press("Enter");

    // 2026-01-02T00:09:00Z = 1767312000000 + 540000 = 1767312540000
    // startTime stays at the full-range start (unchanged by editing only the end)
    await expect(page).toHaveURL(/startTime=1767268800000/);
    await expect(page).toHaveURL(/endTime=1767312540000/);
  });

  test("dragging on the timeline updates the time range input bar", async ({
    page,
  }) => {
    // The timeline is the first recharts-surface in DOM order (rendered above
    // the individual plot charts).
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

    // Drag from 20% to 60% of the plot area width.
    const startX = svgBox.x + plotBounds.x + plotBounds.width * 0.2;
    const endX = svgBox.x + plotBounds.x + plotBounds.width * 0.6;
    const y = svgBox.y + plotBounds.y + plotBounds.height / 2;

    // handleSelection computes: time = fullStart + fractionX * range
    // Dragging to exactly 20% and 60% of the plot area gives fractionX = 0.2 / 0.6.
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

test.describe("Selected time range bar", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await page.goto(PLOTS_URL);
    await waitForPlotsLoad(page);
  });

  test("shows the label and default start/end inputs", async ({ page }) => {
    await expect(page.getByText("Selected Time Range (TAI):")).toBeVisible();
    // Full range for dayobs 20260101: noon Jan 1 → 11:59 Jan 2 (UTC)
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
    // Set end to 00:09 on Jan 2 — mock records run from 00:00, one per minute,
    // so records 1–10 (00:00–00:09) fall within the range.
    await endInput.fill("00:09  2026-01-02");
    await endInput.press("Enter");
    await expect(page.getByText("10 of 30 exposures selected")).toBeVisible();
  });
});
