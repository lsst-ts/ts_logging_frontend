// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import {
  waitForDataLogLoad,
  getDataLogUrl,
} from "../../helpers/datalog-helpers.js";

const DATALOG_URL = getDataLogUrl();

test.describe("Data-log page — empty data", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page, { "data-log": { data_log: [] } });
    await page.goto(DATALOG_URL);
    await waitForDataLogLoad(page);
  });

  test("no data notification banner and 0 rows when no data returned", async ({
    page,
  }) => {
    await expect(page.getByText("No exposures found in ConsDB")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(0);
  });

  test("shows 0 of 0 exposures selected", async ({ page }) => {
    await expect(page.getByText("0 of 0 exposures selected")).toBeVisible({
      timeout: 10000,
    });
  });

  test("no-data banner can be dismissed", async ({ page }) => {
    const banner = page.getByText("No exposures found in ConsDB");
    await expect(banner).toBeVisible({ timeout: 10000 });

    await page.getByRole("button", { name: "Dismiss" }).click();
    await expect(banner).toHaveCount(0);
  });
});
