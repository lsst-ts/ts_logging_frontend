// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import {
  waitForDataLogLoad,
  getDataLogUrl,
} from "../../helpers/datalog-helpers.js";

const DATALOG_URL = getDataLogUrl();

test.describe("Data-log page — API errors", () => {
  test("data-log 500 shows an error banner and table is empty", async ({
    page,
  }) => {
    await setupApiMocks(page);
    await page.route("**/nightlydigest/api/data-log*", (route) =>
      route.fulfill({ status: 500, json: { detail: "Internal Server Error" } }),
    );
    await page.goto(DATALOG_URL);
    await waitForDataLogLoad(page);

    await expect(
      page.getByText("One or more data sources are unavailable."),
    ).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.getByText("exposures failed to load. Data may be incomplete."),
    ).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(0);
  });

  test("exposure-entries 500 shows an error banner, table still renders", async ({
    page,
  }) => {
    await setupApiMocks(page);
    await page.route("**/nightlydigest/api/exposure-entries*", (route) =>
      route.fulfill({ status: 500, json: { detail: "Internal Server Error" } }),
    );
    await page.goto(DATALOG_URL);
    await waitForDataLogLoad(page);

    await expect(
      page.getByText("One or more data sources are unavailable."),
    ).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.getByText("exposure-flags failed to load. Data may be incomplete."),
    ).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(30);
  });

  test("almanac 500 shows an error banner but table still renders", async ({
    page,
  }) => {
    await setupApiMocks(page);
    await page.route("**/nightlydigest/api/almanac*", (route) =>
      route.fulfill({ status: 500, json: { detail: "Internal Server Error" } }),
    );
    await page.goto(DATALOG_URL);
    await waitForDataLogLoad(page);

    await expect(
      page.getByText("One or more data sources are unavailable."),
    ).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.getByText("almanac failed to load. Data may be incomplete."),
    ).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(30);
  });

  test("almanac null shows an error banner but table still renders", async ({
    page,
  }) => {
    // fetchAlmanac returns data.almanac_info — null here makes prepareAlmanacData
    // throw, which is caught the same way as any other almanac fetch failure.
    await setupApiMocks(page, { almanac: { almanac_info: null } });
    await page.goto(DATALOG_URL);
    await waitForDataLogLoad(page);

    await expect(
      page.getByText("One or more data sources are unavailable."),
    ).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.getByText("almanac failed to load. Data may be incomplete."),
    ).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(30);
  });

  test("block-details 500 shows an error banner", async ({ page }) => {
    await setupApiMocks(page);
    await page.route("**/nightlydigest/api/block-details*", (route) =>
      route.fulfill({ status: 500, json: { detail: "Error" } }),
    );
    await page.goto(DATALOG_URL);
    await waitForDataLogLoad(page);

    await expect(
      page.getByText("One or more data sources are unavailable."),
    ).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.getByText(
        "jira-blocks, zephyr-blocks failed to load. Data may be incomplete.",
      ),
    ).toBeVisible({
      timeout: 10000,
    });
  });
});
