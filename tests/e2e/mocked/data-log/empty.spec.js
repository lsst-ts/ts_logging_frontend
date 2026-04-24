// @ts-check
import { test, expect } from "@playwright/test";
import {
  setupDataLogMocks,
  waitForDataLogLoad,
  clickColumnMenuItem,
} from "../../helpers/data-log-helpers.js";
import { DATA_LOG_URL } from "../../helpers/constants.js";

test.describe("Data Log — empty data", () => {
  test.beforeEach(async ({ page }) => {
    await setupDataLogMocks(page, { "data-log": { data_log: [] } });
    await page.goto(DATA_LOG_URL);
    await waitForDataLogLoad(page);
  });

  test("warning toast appears with no-data message", async ({ page }) => {
    await expect(
      page.locator("[data-sonner-toast]").filter({
        hasText: "No data log records found in ConsDB",
      }),
    ).toBeVisible({ timeout: 5000 });
  });

  test("table has 0 data rows", async ({ page }) => {
    await expect(page.locator("tbody tr")).toHaveCount(0);
  });

  test("SelectedTimeRangeBar shows '0 of 0 exposures selected'", async ({
    page,
  }) => {
    await expect(page.getByText("0 of 0 exposures selected")).toBeVisible();
  });

  test("timeline still renders", async ({ page }) => {
    await expect(page.locator(".recharts-surface").first()).toBeVisible();
  });

  test("sorting on empty table doesn't crash", async ({ page }) => {
    await clickColumnMenuItem(page, "Airmass", "Sort by asc.");
    await expect(page.locator("tbody tr")).toHaveCount(0);
  });

  test("Reset Table on empty table doesn't crash", async ({ page }) => {
    await page.getByRole("button", { name: "Reset Table" }).click();
    await expect(page.locator("tbody tr")).toHaveCount(0);
  });
});
