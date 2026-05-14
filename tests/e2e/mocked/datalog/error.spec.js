// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import {
  waitForDataLogLoad,
  getDataLogUrl,
} from "../../helpers/datalog-helpers.js";

const DATALOG_URL = getDataLogUrl();

test.describe("Data-log page — API errors", () => {
  test("data-log 500 shows ConsDB error toast and table is empty", async ({
    page,
  }) => {
    await setupApiMocks(page);
    await page.route("**/nightlydigest/api/data-log*", (route) =>
      route.fulfill({ status: 500, json: { detail: "Internal Server Error" } }),
    );
    await page.goto(DATALOG_URL);
    await waitForDataLogLoad(page);

    await expect(
      page.getByText("Error fetching data from ConsDB!"),
    ).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(0);
  });

  test("exposure-entries 500 shows exposure log error toast, table still renders", async ({
    page,
  }) => {
    await setupApiMocks(page);
    await page.route("**/nightlydigest/api/exposure-entries*", (route) =>
      route.fulfill({ status: 500, json: { detail: "Internal Server Error" } }),
    );
    await page.goto(DATALOG_URL);
    await waitForDataLogLoad(page);

    await expect(
      page.getByText("Error fetching exposure log data!"),
    ).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(30);
  });

  test("almanac 500 shows almanac error toast but table still renders", async ({
    page,
  }) => {
    await setupApiMocks(page);
    await page.route("**/nightlydigest/api/almanac*", (route) =>
      route.fulfill({ status: 500, json: { detail: "Internal Server Error" } }),
    );
    await page.goto(DATALOG_URL);
    await waitForDataLogLoad(page);

    await expect(page.getByText("Error fetching almanac!")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(30);
  });

  test("almanac null shows warning toast but table still renders", async ({
    page,
  }) => {
    // fetchAlmanac returns data.almanac_info — null here triggers the warning toast
    await setupApiMocks(page, { almanac: { almanac_info: null } });
    await page.goto(DATALOG_URL);
    await waitForDataLogLoad(page);

    await expect(page.getByText("No almanac data available")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(30);
  });

  test("block-details 500 shows BLOCK error toast", async ({ page }) => {
    await setupApiMocks(page);
    await page.route("**/nightlydigest/api/block-details*", (route) =>
      route.fulfill({ status: 500, json: { detail: "Error" } }),
    );
    await page.goto(DATALOG_URL);
    await waitForDataLogLoad(page);

    await expect(page.getByText(/Error fetching BLOCK/)).toBeVisible({
      timeout: 10000,
    });
  });
});
