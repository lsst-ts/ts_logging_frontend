// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../helpers/mock-api.js";

// Fixed dayobs matching the fixture data (20260110, LSSTCam night).
// On localhost the retention policy is null, so any past date is valid.
const TEST_DAYOBS = "20260110";
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

test.describe("Plots page — show/hide plots", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await page.goto(PLOTS_URL);
    await waitForPlotsLoad(page);
  });

  test("user can add two plots then remove two plots via the dialog", async ({
    page,
  }) => {
    // --- Starting state ---
    await expect(page.locator("[data-slot='chart']")).toHaveCount(4);

    // --- Open dialog and add two plots ---
    await page.getByRole("button", { name: "Show / Hide Plots" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    // Add Exposure Time (exp_time) — enabled because fixture has non-null exp_time
    await page.locator("label[for='plot-selected-exp_time']").click();

    // Add Air Temperature (air_temp) — enabled because fixture has non-null air_temp
    await page.locator("label[for='plot-selected-air_temp']").click();

    // Close the dialog
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();

    // Two plots added → 6 total
    await expect(page.locator("[data-slot='chart']")).toHaveCount(6);

    // --- Re-open dialog and remove two plots ---
    await page.getByRole("button", { name: "Show / Hide Plots" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    // Remove Airmass (airmass) — currently checked
    await page.locator("label[for='plot-selected-airmass']").click();

    // Remove Seeing / PSF FWHM (psf_median) — currently checked
    await page.locator("label[for='plot-selected-psf_median']").click();

    // Close the dialog
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();

    // Two plots removed → back to 4
    await expect(page.locator("[data-slot='chart']")).toHaveCount(4);
  });
});
