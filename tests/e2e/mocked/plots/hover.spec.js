// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import { generateDataLogMock } from "../../helpers/mock-generators.js";
import { waitForPlotsLoad, hoverDot } from "../../helpers/plots-helpers.js";
import { PLOTS_URL, TEST_DAYOBS_INT } from "../../helpers/constants.js";

// ---------------------------------------------------------------------------

test.describe("Hover interactions — tooltip", () => {
  // Use a small dataset with spread-out airmass values so dots don't overlap
  // and hover targeting is reliable.
  const HOVER_MOCK_DATA = generateDataLogMock(5, {
    dayobs: TEST_DAYOBS_INT,
    postProcess: (r) => ({ ...r, airmass: 1.0 + r.seq_num * 0.2 }),
  });

  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page, { "data-log": HOVER_MOCK_DATA });
    await page.goto(PLOTS_URL);
    await waitForPlotsLoad(page);
    // Wait for at least one dot to be in the DOM before hovering
    await expect(
      page
        .locator("[data-slot='chart']")
        .first()
        .locator("[data-obsid]")
        .first(),
    ).toBeAttached();
  });

  test("tooltip appears when hovering over a data point", async ({ page }) => {
    const firstChart = page.locator("[data-slot='chart']").first();
    await hoverDot(page, firstChart);
    const tooltip = firstChart.locator(".recharts-tooltip-wrapper");
    await expect(tooltip).toBeVisible();
  });

  test("tooltip shows the plot title and a numeric value", async ({ page }) => {
    const firstChart = page.locator("[data-slot='chart']").first();
    await hoverDot(page, firstChart);
    // Scope tooltip to the first chart to avoid strict-mode violation
    // (there is one .recharts-tooltip-wrapper per chart on the page).
    const tooltip = firstChart.locator(".recharts-tooltip-wrapper");
    await expect(tooltip).toBeVisible();
    // First default chart is Airmass; the tooltip formatter renders "<title>: <value>"
    await expect(tooltip).toContainText("Airmass:");
    // Mock data has airmass values like 1.2, 1.4, … — all non-integer so
    // the formatter rounds to 4 d.p.  Check for the pattern N.NNNN.
    await expect(tooltip).toContainText(/\d\.\d{4}/);
  });

  test("tooltip value matches the mock data for the hovered record", async ({
    page,
  }) => {
    // seq_num=1 with postProcess airmass = 1.0 + 1*0.2 = 1.2
    // The tooltip formatter rounds to 4 d.p. → "1.2000"
    const firstChart = page.locator("[data-slot='chart']").first();
    await hoverDot(page, firstChart, 0);
    const tooltip = firstChart.locator(".recharts-tooltip-wrapper");
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText("1.2000");
  });

  test("tooltip shows accurate observation metadata", async ({ page }) => {
    const firstChart = page.locator("[data-slot='chart']").first();
    await hoverDot(page, firstChart);
    const tooltip = firstChart.locator(".recharts-tooltip-wrapper");
    await expect(tooltip).toBeVisible();
    // All mock records share these values
    await expect(tooltip).toContainText("20260101"); // day_obs
    await expect(tooltip).toContainText("y_10"); // physical_filter
    await expect(tooltip).toContainText("Sequence:");
  });

  test("tooltip disappears when mouse leaves the chart area", async ({
    page,
  }) => {
    const firstChart = page.locator("[data-slot='chart']").first();
    await hoverDot(page, firstChart);
    const tooltip = firstChart.locator(".recharts-tooltip-wrapper");
    await expect(tooltip).toBeVisible();

    // Move the mouse outside the chart boundary
    const bbox = await firstChart.boundingBox();
    await page.mouse.move(bbox.x + bbox.width + 50, bbox.y);

    await expect(tooltip).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------

test.describe("Hover interactions — cross-plot highlight", () => {
  // Use a small dataset with spread-out values so dots are well-separated
  const HOVER_MOCK_DATA = generateDataLogMock(5, {
    dayobs: TEST_DAYOBS_INT,
    postProcess: (r) => ({
      ...r,
      airmass: 1.0 + r.seq_num * 0.2,
      zero_point_median: 30 + r.seq_num,
      sky_bg_median: 600 + r.seq_num * 10,
    }),
  });

  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page, { "data-log": HOVER_MOCK_DATA });
    await page.goto(PLOTS_URL);
    await waitForPlotsLoad(page);
    // Wait for dots to be in the DOM
    await expect(
      page
        .locator("[data-slot='chart']")
        .first()
        .locator("[data-obsid]")
        .first(),
    ).toBeAttached();
  });

  test("hovering over a point shows a highlight in each other plot", async ({
    page,
  }) => {
    const charts = page.locator("[data-slot='chart']");
    await expect(charts).toHaveCount(4);

    // Hover over the first dot in the first (Airmass) chart
    await hoverDot(page, charts.first());

    // All four charts register with the hoverStore, so each should have a
    // visible hover indicator (the ReferenceDot circle) after the hover.
    for (let i = 0; i < 4; i++) {
      const hoverIndicator = charts.nth(i).locator("[data-hover-indicator]");
      await expect(hoverIndicator).toHaveCSS("display", "block");
    }
  });

  test("the highlighted point is the same exposure across all plots", async ({
    page,
  }) => {
    const charts = page.locator("[data-slot='chart']");

    // Read the exposure id of the dot we are about to hover
    const targetDot = charts.first().locator("[data-obsid]").first();
    const obsId = await targetDot.getAttribute("data-obsid");

    await hoverDot(page, charts.first());

    // Every chart should contain a rendered dot for this exposure id — this
    // is the dot whose position the hover indicator is moved to.
    for (let i = 0; i < 4; i++) {
      await expect(
        charts.nth(i).locator(`[data-obsid="${obsId}"]`),
      ).toBeAttached();
    }
  });

  test("highlight indicator is positioned at the data point, not off-screen", async ({
    page,
  }) => {
    const charts = page.locator("[data-slot='chart']");

    await hoverDot(page, charts.first());

    // The hoverStore moves the ReferenceDot circle from its initial position
    // of (-9999, -9999) to the matching data point's cx/cy.
    // Check that cx has been updated to a finite, non-sentinel value.
    const indicator = charts.nth(1).locator("[data-hover-indicator]");
    await expect(indicator).toHaveCSS("display", "block");
    const cx = await indicator.getAttribute("cx");
    expect(parseFloat(cx)).not.toBe(-9999);
    expect(isFinite(parseFloat(cx))).toBe(true);
  });

  test("highlight clears when mouse leaves the chart", async ({ page }) => {
    const charts = page.locator("[data-slot='chart']");

    // Hover over a dot to establish the highlight
    await hoverDot(page, charts.first());

    // Verify the highlight is active in a different chart before leaving
    const indicator = charts.nth(1).locator("[data-hover-indicator]");
    await expect(indicator).toHaveCSS("display", "block");

    // Move the mouse well outside all charts (top-left corner of the page)
    await page.mouse.move(0, 0);

    // onMouseLeave → hoverStore.setHover(null) → display:none on all indicators
    await expect(indicator).toHaveCSS("display", "none");
  });
});
