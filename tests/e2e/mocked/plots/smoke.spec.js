// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import { generateDataLogMock } from "../../helpers/mock-generators.js";
import { waitForPlotsLoad } from "../../helpers/plots-helpers.js";
import { PLOTS_URL, TEST_DAYOBS_INT } from "../../helpers/constants.js";

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

// ---------------------------------------------------------------------------

test.describe("Plots page — empty data", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page, { "data-log": { data_log: [] } });
    await page.goto(PLOTS_URL);
    await waitForPlotsLoad(page);
  });

  test("shows a warning toast when there are no records", async ({ page }) => {
    await expect(
      page.getByText(
        "No data log records found in ConsDB for the selected date range.",
      ),
    ).toBeVisible({ timeout: 10000 });
  });

  test("renders no data-point dots", async ({ page }) => {
    await expect(page.locator("[data-obsid]")).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------

test.describe("Plots page — single record", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page, {
      "data-log": generateDataLogMock(1, { dayobs: TEST_DAYOBS_INT }),
    });
    await page.goto(PLOTS_URL);
    await waitForPlotsLoad(page);
  });

  test("each default chart renders exactly one dot", async ({ page }) => {
    const charts = page.locator("[data-slot='chart']");
    await expect(charts).toHaveCount(4);
    for (let i = 0; i < 4; i++) {
      await expect(charts.nth(i).locator("[data-obsid]")).toHaveCount(1);
    }
  });
});

// ---------------------------------------------------------------------------

test.describe("Plots page — API errors", () => {
  test("a data-log 500 shows an error toast", async ({ page }) => {
    await setupApiMocks(page);
    // Override data-log after setupApiMocks — Playwright evaluates routes LIFO
    // so this handler takes precedence over the one registered inside setupApiMocks.
    await page.route("**/nightlydigest/api/data-log*", (route) =>
      route.fulfill({ status: 500, json: { detail: "Internal Server Error" } }),
    );
    await page.goto(PLOTS_URL);
    await waitForPlotsLoad(page);

    await expect(page.getByText("Error fetching data log!")).toBeVisible({
      timeout: 10000,
    });
  });

  test("an almanac 500 shows an error toast and data plots still render", async ({
    page,
  }) => {
    await setupApiMocks(page);
    // Only the almanac endpoint fails; data-log succeeds normally.
    await page.route("**/nightlydigest/api/almanac*", (route) =>
      route.fulfill({ status: 500, json: { detail: "Internal Server Error" } }),
    );
    await page.goto(PLOTS_URL);
    await waitForPlotsLoad(page);

    await expect(page.getByText("Error fetching almanac!")).toBeVisible({
      timeout: 10000,
    });
    // Data dots should still be present despite the almanac failure
    const firstChart = page.locator("[data-slot='chart']").first();
    await expect(firstChart.locator("[data-obsid]").first()).toBeAttached();
  });
});
