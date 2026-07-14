// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import {
  waitForDataLogLoad,
  getDataLogUrl,
} from "../../helpers/datalog-helpers.js";

const DATALOG_URL = getDataLogUrl();

test.describe("Data-log page — timeline context menu", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await page.goto(DATALOG_URL);
    await waitForDataLogLoad(page);
  });

  test("right-click on the timeline shows the navigation menu items", async ({
    page,
  }) => {
    await page.locator("canvas").first().click({ button: "right" });

    await expect(
      page.getByRole("menuitem", { name: "View Context Feed" }),
    ).toBeVisible();
    await expect(
      page.getByRole("menuitem", { name: "View Plots" }),
    ).toBeVisible();
  });

  test("View Plots navigates preserving the search params", async ({
    page,
  }) => {
    await page.locator("canvas").first().click({ button: "right" });
    await page.getByRole("menuitem", { name: "View Plots" }).click();

    await expect(page).toHaveURL(/\/nightlydigest\/plots/);
    await expect(page).toHaveURL(/startDayobs=20260101/);
    await expect(page).toHaveURL(/telescope=Simonyi/);
  });

  test("View Context Feed navigates preserving the search params", async ({
    page,
  }) => {
    await page.locator("canvas").first().click({ button: "right" });
    await page.getByRole("menuitem", { name: "View Context Feed" }).click();

    await expect(page).toHaveURL(/\/nightlydigest\/context-feed/);
    await expect(page).toHaveURL(/startDayobs=20260101/);
    await expect(page).toHaveURL(/telescope=Simonyi/);
  });
});
