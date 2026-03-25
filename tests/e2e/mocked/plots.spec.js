// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../helpers/mock-api.js";
import { generateDataLogMock } from "../helpers/mock-generators.js";

// Fixed dayobs matching the fixture data (20260110, LSSTCam night).
// On localhost the retention policy is null, so any past date is valid.
const TEST_DAYOBS = "20260101";
const TEST_DAYOBS_INT = 20260101;
const PLOTS_URL = `/nightlydigest/plots?startDayobs=${TEST_DAYOBS}&endDayobs=${TEST_DAYOBS}&telescope=Simonyi`;

/**
 * Waits for the Plots page to finish loading.
 * The "Show / Hide Plots" button is only rendered once both dataLogLoading
 * and almanacLoading are false, making it a reliable load sentinel.
 *
 * @param {import('@playwright/test').Page} page
 */
async function waitForPlotsLoad(page) {
  await expect(
    page.getByRole("button", { name: "Show / Hide Plots" }),
  ).toBeVisible({ timeout: 15000 });
}

// ---------------------------------------------------------------------------

test.describe("Plots page — smoke test", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await page.goto(PLOTS_URL);
  });

  test("loads with default plots and no console errors", async ({ page }) => {
    const consoleErrors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        // Exclude a pre-existing Recharts internal warning about key props on
        // Line children — not caused by our code and not actionable here.
        if (text.includes("Each child in a list should have a unique")) return;
        consoleErrors.push(text);
      }
    });

    await waitForPlotsLoad(page);

    // Page title (filter by name to avoid matching plot-title h1s)
    await expect(
      page.getByRole("heading", { name: /simonyi.*plots/i }),
    ).toBeVisible();

    // Default 4 plots visible (airmass, psf_median, zero_point_median, sky_bg_median)
    await expect(page.locator("[data-slot='chart']")).toHaveCount(4);

    // Controls are present
    await expect(
      page.getByRole("button", { name: "Show / Hide Plots" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Plot Format" }),
    ).toBeVisible();

    expect(consoleErrors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------

test.describe("Show / Hide Plots — open and close", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await page.goto(PLOTS_URL);
    await waitForPlotsLoad(page);
  });

  test("opens when the button is clicked", async ({ page }) => {
    await page.getByRole("button", { name: "Show / Hide Plots" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test.describe("closing", () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole("button", { name: "Show / Hide Plots" }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
    });

    test("closes via Escape", async ({ page }) => {
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).not.toBeVisible();
    });

    test("closes via the close button", async ({ page }) => {
      await page.locator("[data-slot='dialog-close']").click();
      await expect(page.getByRole("dialog")).not.toBeVisible();
    });

    test("closes by clicking outside", async ({ page }) => {
      // Click at top-left corner (outside the dialog content) to trigger
      // Radix's DismissableLayer pointer-outside detection.
      await page.mouse.click(10, 10);
      await expect(page.getByRole("dialog")).not.toBeVisible();
    });
  });
});

// ---------------------------------------------------------------------------

test.describe("Show / Hide Plots — adding and removing plots", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await page.goto(PLOTS_URL);
    await waitForPlotsLoad(page);
  });

  test("checking a plot adds it to the page", async ({ page }) => {
    await expect(page.locator("[data-slot='chart']")).toHaveCount(4);
    await page.getByRole("button", { name: "Show / Hide Plots" }).click();
    await page.locator("label[for='plot-selected-exp_time']").click();
    await page.keyboard.press("Escape");
    await expect(page.locator("[data-slot='chart']")).toHaveCount(5);
  });

  test("unchecking a plot removes it from the page", async ({ page }) => {
    await expect(page.locator("[data-slot='chart']")).toHaveCount(4);
    await page.getByRole("button", { name: "Show / Hide Plots" }).click();
    await page.locator("label[for='plot-selected-airmass']").click();
    await page.keyboard.press("Escape");
    await expect(page.locator("[data-slot='chart']")).toHaveCount(3);
  });
});

// ---------------------------------------------------------------------------

test.describe("Show / Hide Plots — null/disabled plots", () => {
  test("plots with no non-null data are disabled and labelled (null)", async ({
    page,
  }) => {
    const mockData = generateDataLogMock(5, {
      dayobs: TEST_DAYOBS_INT,
      overrides: { airmass: null },
    });
    await setupApiMocks(page, { "data-log": mockData });
    await page.goto(PLOTS_URL);
    await waitForPlotsLoad(page);

    await page.getByRole("button", { name: "Show / Hide Plots" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    // Radix Checkbox renders as <button role="checkbox">, not <input>.
    await expect(page.locator("#plot-selected-airmass")).toBeDisabled();
    await expect(
      page.locator("label[for='plot-selected-airmass']"),
    ).toContainText("(null)");
  });
});

// ---------------------------------------------------------------------------

test.describe("Show / Hide Plots — Select All / Deselect All", () => {
  test("Deselect All hides all plots", async ({ page }) => {
    await setupApiMocks(page);
    await page.goto(PLOTS_URL);
    await waitForPlotsLoad(page);

    await page.getByRole("button", { name: "Show / Hide Plots" }).click();
    await page.getByRole("button", { name: "Deselect All" }).click();
    await page.keyboard.press("Escape");

    await expect(page.locator("[data-slot='chart']")).toHaveCount(0);
  });

  test("Select All shows plots with data but not null-only ones", async ({
    page,
  }) => {
    await setupApiMocks(page, { "data-log": "datalog-null-airmass" });
    await page.goto(PLOTS_URL);
    await waitForPlotsLoad(page);

    await page.getByRole("button", { name: "Show / Hide Plots" }).click();
    await page.getByRole("button", { name: "Deselect All" }).click();
    await page.keyboard.press("Escape");
    await expect(page.locator("[data-slot='chart']")).toHaveCount(0);

    await page.getByRole("button", { name: "Show / Hide Plots" }).click();
    // exact: true prevents substring-matching "Deselect All"
    await page.getByRole("button", { name: "Select All", exact: true }).click();
    await page.keyboard.press("Escape");

    await expect(page.locator("[data-slot='chart']")).toHaveCount(6);
    await page.getByRole("button", { name: "Show / Hide Plots" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.locator("#plot-selected-airmass")).not.toBeChecked();
    await page.keyboard.press("Escape");
  });
});

// ---------------------------------------------------------------------------

test.describe("Plot Format — open and close", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await page.goto(PLOTS_URL);
    await waitForPlotsLoad(page);
  });

  test("opens when the button is clicked", async ({ page }) => {
    await page.getByRole("button", { name: "Plot Format" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test.describe("closing", () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole("button", { name: "Plot Format" }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
    });

    test("closes via Escape", async ({ page }) => {
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).not.toBeVisible();
    });

    test("closes via the close button", async ({ page }) => {
      await page.locator("[data-slot='dialog-close']").click();
      await expect(page.getByRole("dialog")).not.toBeVisible();
    });

    test("closes by clicking outside", async ({ page }) => {
      await page.mouse.click(10, 10);
      await expect(page.getByRole("dialog")).not.toBeVisible();
    });
  });
});

// ---------------------------------------------------------------------------

test.describe("Plot Format — X axis type", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await page.goto(PLOTS_URL);
    await waitForPlotsLoad(page);
  });

  test("Sequence Number mode shows integer ticks on the X axis", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Plot Format" }).click();
    await page.locator("#xaxis-seq").click();
    await page.keyboard.press("Escape");

    const tick = page
      .locator("[data-slot='chart']")
      .first()
      .locator(".recharts-cartesian-axis-tick-value tspan")
      .first();
    await expect(tick).toHaveText(/^\d+$/);
  });

  test("Time mode shows HH:mm ticks on the X axis", async ({ page }) => {
    // Switch away from time first so the change back is observable
    await page.getByRole("button", { name: "Plot Format" }).click();
    await page.locator("#xaxis-seq").click();
    await page.locator("#xaxis-time").click();
    await page.keyboard.press("Escape");

    const tick = page
      .locator("[data-slot='chart']")
      .first()
      .locator(".recharts-cartesian-axis-tick-value tspan")
      .first();
    await expect(tick).toHaveText(/^\d\d:\d\d$/);
  });
});

// ---------------------------------------------------------------------------

test.describe("Plot Format — shape", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await page.goto(PLOTS_URL);
    await waitForPlotsLoad(page);
    // Disable band markers so dot rendering is consistent across all plots
    await page.getByRole("button", { name: "Plot Format" }).click();
    await page.locator("#band-none").click();
    await page.keyboard.press("Escape");
  });

  test("Lines mode: connecting line is visible, dots are transparent", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Plot Format" }).click();
    await page.locator("#shape-line").click();
    await page.keyboard.press("Escape");

    await expect(
      page.locator("[data-slot='chart'] .recharts-line-curve").first(),
    ).not.toHaveAttribute("stroke", "");
    await expect(page.locator("[data-obsid]").first()).toHaveAttribute(
      "fill",
      "rgba(0,0,0,0)",
    );
  });

  test("Dots mode: dots are visible, connecting line is hidden", async ({
    page,
  }) => {
    // Start in lines mode then switch back to dots
    await page.getByRole("button", { name: "Plot Format" }).click();
    await page.locator("#shape-line").click();
    await page.locator("#shape-dots").click();
    await page.keyboard.press("Escape");

    await expect(
      page.locator("[data-slot='chart'] .recharts-line-curve").first(),
    ).toHaveAttribute("stroke", "");
    await expect(page.locator("[data-obsid]").first()).not.toHaveAttribute(
      "fill",
      "rgba(0,0,0,0)",
    );
  });
});

// ---------------------------------------------------------------------------

test.describe("Plot Format — color", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await page.goto(PLOTS_URL);
    await waitForPlotsLoad(page);
    // Disable band markers so the selected color drives all dot fills
    await page.getByRole("button", { name: "Plot Format" }).click();
    await page.locator("#band-none").click();
    await page.keyboard.press("Escape");
  });

  test("changing color changes the fill of dots", async ({ page }) => {
    await page.getByRole("button", { name: "Plot Format" }).click();
    await page.locator("#color-green").click();
    await page.keyboard.press("Escape");

    await expect(
      page.locator("[data-obsid][fill='#3CAE3F']").first(),
    ).toBeVisible();
  });

  test("color is also applied as line stroke in Lines mode", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Plot Format" }).click();
    await page.locator("#color-green").click();
    await page.locator("#shape-line").click();
    await page.keyboard.press("Escape");

    await expect(
      page
        .locator("[data-slot='chart'] .recharts-line-curve[stroke='#3CAE3F']")
        .first(),
    ).toBeAttached();
  });
});

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

  /**
   * Scrolls the first chart into view then moves the mouse to the centre of
   * its first rendered data-point dot.  Uses page.mouse.move() with viewport
   * coordinates from boundingBox() so that we bypass Playwright's strict
   * actionability checks (which fail when closely-packed SVG dots overlap),
   * while still generating real browser mouse-move events that Recharts
   * processes via its onMouseMove handler.
   *
   * Returns the chart-scoped tooltip locator for further assertions.
   */
  async function hoverFirstDot(page) {
    const firstChart = page.locator("[data-slot='chart']").first();
    const firstDot = firstChart.locator("[data-obsid]").first();
    // Ensure the element is scrolled into the viewport so its bounding box
    // is within the visible area and page.mouse.move() reaches it.
    await firstDot.scrollIntoViewIfNeeded();
    const box = await firstDot.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    // Return the tooltip wrapper scoped to the first chart so callers can
    // assert on it without triggering Playwright's strict-mode violation
    // (there is one .recharts-tooltip-wrapper per chart on the page).
    return firstChart.locator(".recharts-tooltip-wrapper");
  }

  test("tooltip appears when hovering over a data point", async ({ page }) => {
    const tooltip = await hoverFirstDot(page);
    await expect(tooltip).toBeVisible();
  });

  test("tooltip shows the plot title and a numeric value", async ({ page }) => {
    const tooltip = await hoverFirstDot(page);
    await expect(tooltip).toBeVisible();
    // First default chart is Airmass; the tooltip formatter renders "<title>: <value>"
    await expect(tooltip).toContainText("Airmass:");
    // Mock data has airmass values like 1.2, 1.4, … — all non-integer so
    // the formatter rounds to 4 d.p.  Check for the pattern N.NNNN.
    await expect(tooltip).toContainText(/\d\.\d{4}/);
  });

  test("tooltip shows accurate observation metadata", async ({ page }) => {
    const tooltip = await hoverFirstDot(page);
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
    const tooltip = await hoverFirstDot(page);
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

  /**
   * Scrolls the nth dot (0-based) in the given chart into the viewport then
   * moves the mouse there.  Uses page.mouse.move() to avoid Playwright's
   * actionability check that rejects overlapping SVG elements.
   */
  async function hoverDot(page, chartLocator, dotIndex = 0) {
    const dot = chartLocator.locator("[data-obsid]").nth(dotIndex);
    await dot.scrollIntoViewIfNeeded();
    const box = await dot.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  }

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

// ---------------------------------------------------------------------------

test.describe("Plot Format — band marker", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await page.goto(PLOTS_URL);
    await waitForPlotsLoad(page);
  });

  test("None: band key is not displayed", async ({ page }) => {
    await page.getByRole("button", { name: "Plot Format" }).click();
    await page.locator("label[for='band-none']").click();
    await page.keyboard.press("Escape");

    await expect(page.getByText("Bands:")).not.toBeVisible();
  });

  test("Colors: band key shows a colored circle for each band", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Plot Format" }).click();
    await page.locator("label[for='band-bandColor']").click();
    await page.keyboard.press("Escape");

    await expect(page.getByText("Bands:")).toBeVisible();
    const bandKey = page.getByText("Bands:").locator("..");
    await expect(bandKey.locator("circle").first()).toBeVisible();
    await expect(bandKey.locator("polygon")).toHaveCount(0);
  });

  test("Colors & Icons: band key shows shaped icons for each band", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Plot Format" }).click();
    await page.locator("label[for='band-bandColorsIcons']").click();
    await page.keyboard.press("Escape");

    await expect(page.getByText("Bands:")).toBeVisible();
    // g and r bands use TriangleShape / FlippedTriangleShape (SVG polygon elements)
    const bandKey = page.getByText("Bands:").locator("..");
    await expect(bandKey.locator("polygon").first()).toBeVisible();
  });
});
