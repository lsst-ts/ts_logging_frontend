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
