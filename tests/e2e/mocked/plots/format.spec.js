// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import { waitForPlotsLoad } from "../../helpers/plots-helpers.js";
import { PLOTS_URL } from "../../helpers/constants.js";

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

test.describe("Plot Format — Show X Axis Label", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await page.goto(PLOTS_URL);
    await waitForPlotsLoad(page);
  });

  test("label is visible by default", async ({ page }) => {
    const label = page
      .locator("[data-slot='chart']")
      .first()
      .locator(".recharts-label");
    await expect(label).toBeVisible();
  });

  test("unchecking hides the x axis label", async ({ page }) => {
    await page.getByRole("button", { name: "Plot Format" }).click();
    await page.locator("#xaxis-show").click();
    await page.keyboard.press("Escape");

    await expect(
      page.locator("[data-slot='chart']").first().locator(".recharts-label"),
    ).toHaveCount(0);
  });

  test("rechecking restores the x axis label", async ({ page }) => {
    await page.getByRole("button", { name: "Plot Format" }).click();
    await page.locator("#xaxis-show").click();
    await page.locator("#xaxis-show").click();
    await page.keyboard.press("Escape");

    await expect(
      page.locator("[data-slot='chart']").first().locator(".recharts-label"),
    ).toBeVisible();
  });

  test("label shows 'Sequence Number' in seq mode", async ({ page }) => {
    await page.getByRole("button", { name: "Plot Format" }).click();
    await page.locator("#xaxis-seq").click();
    await page.keyboard.press("Escape");

    await expect(
      page.locator("[data-slot='chart']").first().locator(".recharts-label"),
    ).toHaveText("Sequence Number");
  });

  test("label shows 'Observation Start Time (TAI)' in time mode", async ({
    page,
  }) => {
    // Switch to seq first so the change back to time is observable
    await page.getByRole("button", { name: "Plot Format" }).click();
    await page.locator("#xaxis-seq").click();
    await page.locator("#xaxis-time").click();
    await page.keyboard.press("Escape");

    await expect(
      page.locator("[data-slot='chart']").first().locator(".recharts-label"),
    ).toHaveText("Observation Start Time (TAI)");
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

  test("Colors: y-band dots use the band color (#fdc900) on bandMarker plots", async ({
    page,
  }) => {
    // Default fixture has all records with band="y".  Switch to Colors mode and
    // check that a dot in the PSF chart (which has bandMarker=true) uses the y
    // band color.
    await page.getByRole("button", { name: "Plot Format" }).click();
    await page.locator("label[for='band-bandColor']").click();
    await page.keyboard.press("Escape");

    const psfChart = page.locator(
      '[data-slot="chart"][title="Seeing (PSF FWHM)"]',
    );
    await expect(
      psfChart.locator('[data-obsid][fill="#fdc900"]').first(),
    ).toBeVisible();
  });

  test("Colors: Airmass dots do not use the band color (bandMarker=false)", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Plot Format" }).click();
    await page.locator("label[for='band-bandColor']").click();
    await page.keyboard.press("Escape");

    const airmassChart = page.locator('[data-slot="chart"][title="Airmass"]');
    // Airmass has bandMarker=false so its dots must NOT be coloured by band
    await expect(
      airmassChart.locator('[data-obsid][fill="#fdc900"]'),
    ).toHaveCount(0);
  });
});
