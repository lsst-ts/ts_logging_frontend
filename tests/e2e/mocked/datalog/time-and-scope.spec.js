// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import {
  generateDataLogMock,
  generateDataLogMockMultiBand,
} from "../../helpers/mock-generators.js";
import {
  waitForDataLogLoad,
  applyFilter,
  groupBy,
  getDataLogUrl,
} from "../../helpers/datalog-helpers.js";

const DATALOG_URL = getDataLogUrl();

// Mock records start at 2026-01-02T00:00:00Z, one per minute.
const FIRST_RECORD_MILLIS = 1767312000000;
// Covers records 1..15 (00:00:00 to 00:14:00, bounds inclusive)
const WINDOW_START = FIRST_RECORD_MILLIS;
const WINDOW_END = FIRST_RECORD_MILLIS + 14 * 60_000;

test.describe("Data-log page — time range and filters together", () => {
  test.beforeEach(async ({ page }) => {
    // Bands cycle g,r,i,z,y — y_10 falls on seq_nums 5,10,15,20,25,30
    await setupApiMocks(page, { "data-log": generateDataLogMockMultiBand(30) });
  });

  test("narrowed time range drives the table row count", async ({ page }) => {
    await page.goto(
      `${DATALOG_URL}&startTime=${WINDOW_START}&endTime=${WINDOW_END}`,
    );
    await waitForDataLogLoad(page);

    await expect(page.getByText("15 of 30 exposures selected")).toBeVisible();
    await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(15);
  });

  test("time range and column filter apply as an intersection", async ({
    page,
  }) => {
    // Window covers seq 1-15; y_10 within it: 5, 10, 15 → 3 rows
    await page.goto(
      `${DATALOG_URL}&startTime=${WINDOW_START}&endTime=${WINDOW_END}&physical_filter=y_10`,
    );
    await waitForDataLogLoad(page);
    await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(3);
  });

  test("applying a filter within a narrowed time range intersects too", async ({
    page,
  }) => {
    await page.goto(
      `${DATALOG_URL}&startTime=${WINDOW_START}&endTime=${WINDOW_END}`,
    );
    await waitForDataLogLoad(page);
    await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(15);

    await applyFilter(page, "Filter", "y_10");
    await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(3);
  });
});

test.describe("Data-log page — multi-day range", () => {
  test.beforeEach(async ({ page }) => {
    const night1 = generateDataLogMock(30, { dayobs: 20260101 });
    const night2 = generateDataLogMock(30, { dayobs: 20260102 });
    await setupApiMocks(page, {
      "data-log": { data_log: [...night1.data_log, ...night2.data_log] },
    });
    await page.goto(getDataLogUrl("20260101", "Simonyi", "20260102"));
    await waitForDataLogLoad(page);
  });

  test("both nights load: 60 rows and counter shows 60 of 60", async ({
    page,
  }) => {
    await expect(page.getByText("60 of 60 exposures selected")).toBeVisible();
    await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(60);
  });

  test("grouping by Day Obs yields one group of 30 per night", async ({
    page,
  }) => {
    // Day Obs is hidden by default — show it first
    await page.getByRole("button", { name: "Show / Hide Columns" }).click();
    const popover = page.locator("[data-slot='popover-content']");
    const dayObsRow = popover
      .locator("div.flex.items-center")
      .filter({ hasText: "Day Obs" });
    await dayObsRow.locator("[data-slot='checkbox']").click();
    await page.keyboard.press("Escape");

    await groupBy(page, "Day Obs");
    await expect(page.getByText(/Day Obs: 20260101 \(30\)/)).toBeVisible();
    await expect(page.getByText(/Day Obs: 20260102 \(30\)/)).toBeVisible();
  });
});

test.describe("Data-log page — runtime telescope switch", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page, { "data-log": generateDataLogMockMultiBand(30) });
    await page.goto(`${DATALOG_URL}&physical_filter=y_10`);
    await waitForDataLogLoad(page);
    await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(6);
  });

  test("switching to AuxTel updates URL, swaps default columns, and ignores the stale filter param", async ({
    page,
  }) => {
    await page.locator("#instrument").click();
    await page.getByRole("option", { name: "AuxTel" }).click();
    await waitForDataLogLoad(page);

    await expect(page).toHaveURL(/telescope=AuxTel/);

    // AuxTel defaults: exposure_name visible, exposure_id and Filter absent
    await expect(
      page.getByRole("columnheader", { name: /^Exposure Name/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: /^Exposure Id/ }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("columnheader", { name: /^Filter/ }),
    ).toHaveCount(0);

    // The stale physical_filter param must not break the page or filter rows
    await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(30);
  });
});
