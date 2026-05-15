// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import {
  waitForDataLogLoad,
  getDataLogUrl,
  openColumnMenu,
} from "../../helpers/datalog-helpers.js";

const DATALOG_URL = getDataLogUrl();

test.describe("Data-log page — empty data", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page, { "data-log": { data_log: [] } });
    await page.goto(DATALOG_URL);
    await waitForDataLogLoad(page);
  });

  test("warning toast and 0 rows when no data returned", async ({ page }) => {
    await expect(
      page.getByText(
        "No data log records found in ConsDB for the selected date range.",
      ),
    ).toBeVisible({ timeout: 10000 });
    await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(0);
  });

  test("shows 0 of 0 exposures selected", async ({ page }) => {
    await expect(page.getByText("0 of 0 exposures selected")).toBeVisible({
      timeout: 10000,
    });
  });

  test("reset button doesn't crash on empty table", async ({ page }) => {
    await page.getByRole("button", { name: "Reset Table" }).click();
    await expect(page.locator("[data-slot='table-body']")).toBeAttached();
  });

  test("column menu opens and shows sort/group options on empty table", async ({
    page,
  }) => {
    // Use a column that isn't the default sort (Exposure Id is sorted asc by default)
    await openColumnMenu(page, "Airmass");
    await expect(page.getByText("Sort by asc.")).toBeVisible();
    await expect(page.getByText("Group by")).toBeVisible();
  });
});
