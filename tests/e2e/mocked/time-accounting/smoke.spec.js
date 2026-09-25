// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import { TIME_ACCOUNTING_URL } from "../../helpers/constants.js";
import { dragOn, getTimeParams } from "../../helpers/plots-helpers.js";
import { waitForTimeAccountingLoad } from "../../helpers/time-accounting-helpers.js";

test.describe("Time Accounting — loading state", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    // Keep obs-status pending so the page stays in its loading state.
    await page.route("**/nightlydigest/api/obs-status*", () => {});
    await page.goto(TIME_ACCOUNTING_URL);
  });

  test("shows a skeleton while the observatory status data is loading", async ({
    page,
  }) => {
    // The timeline applet header is always rendered, so check its card title,
    // and confirm the chart itself is absent (still loading).
    await expect(
      page.getByText("Timeline of Observatory State Changes"),
    ).toBeVisible();
    await expect(
      page.locator('[data-slot="skeleton"]').first(),
    ).toBeVisible();
    await expect(
      page.locator('[data-slot="obs-status-timeline"]'),
    ).toHaveCount(0);
  });
});

test.describe("Time Accounting — full availability", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await page.goto(TIME_ACCOUNTING_URL);
    await waitForTimeAccountingLoad(page);
  });

  test("renders the observatory status timeline applet", async ({ page }) => {
    await expect(
      page.getByText("Timeline of Observatory State Changes"),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Hide Timeline" }),
    ).toBeVisible();
  });

  test("opens the timeline in fullscreen", async ({ page }) => {
    await page
      .getByRole("button", {
        name: "Open observatory status timeline in fullscreen",
      })
      .click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(
      dialog.locator('[data-slot="obs-status-timeline"]').first(),
    ).toBeVisible();
  });

  test("renders both observatory status cumulative plot applets", async ({
    page,
  }) => {
    await expect(
      page.getByText("Observatory Status - Single Night Accumulations"),
    ).toBeVisible();
    await expect(
      page.getByText("Observatory Status - Multi Night Accumulations"),
    ).toBeVisible();
    // Each applet shows a Hide Graph toggle.
    await expect(
      page.getByRole("button", { name: "Hide Graph" }).first(),
    ).toBeVisible();
  });

  test("renders the observatory status breakdown table", async ({ page }) => {
    const table = page.locator("#obs-status-breakdown-table");
    await expect(table).toBeVisible();
    // Summary rows are the first rows of the breakdown table.
    await expect(table).toContainText("Night Hours");
    await expect(table).toContainText("Dome Open");
  });

  test("selecting on the timeline adds integer startTime and endTime to the URL", async ({
    page,
  }) => {
    const timeline = page.locator('[data-slot="obs-status-timeline"]').first();
    await expect(timeline).toBeVisible();

    await dragOn(page, timeline, {
      fromX: 0.25,
      toX: 0.75,
      fromY: 0.5,
      toY: 0.5,
    });

    await expect(page).toHaveURL(/startTime=/);
    const { startTime, endTime } = getTimeParams(page);
    expect(startTime).not.toBeNull();
    expect(endTime).not.toBeNull();
    expect(Number.isInteger(startTime)).toBe(true);
    expect(Number.isInteger(endTime)).toBe(true);
  });
});
