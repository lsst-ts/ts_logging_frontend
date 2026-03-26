// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import { waitForPlotsLoad } from "../../helpers/plots-helpers.js";
import { PLOTS_URL } from "../../helpers/constants.js";

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

    // Page header — CardTitle is a div (not a heading), so match by slot + text
    await expect(page.locator("[data-slot='card-title']")).toContainText(
      "Plots:",
    );

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
