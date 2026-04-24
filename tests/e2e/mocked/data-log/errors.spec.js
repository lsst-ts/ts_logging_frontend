// @ts-check
import { test, expect } from "@playwright/test";
import {
  setupDataLogMocks,
  waitForDataLogLoad,
} from "../../helpers/data-log-helpers.js";
import { DATA_LOG_URL } from "../../helpers/constants.js";

// ---------------------------------------------------------------------------
// data-log endpoint fails (500)
// ---------------------------------------------------------------------------

test.describe("Data Log — data-log endpoint 500", () => {
  test.beforeEach(async ({ page }) => {
    await setupDataLogMocks(page);
    await page.route("**/nightlydigest/api/data-log*", (route) =>
      route.fulfill({ status: 500, body: "Server Error" }),
    );
    await page.goto(DATA_LOG_URL);
    // Page still renders the shell — wait for the Reset Table button
    await page
      .getByRole("button", { name: "Reset Table" })
      .waitFor({ state: "visible", timeout: 15000 });
  });

  test("error toast appears", async ({ page }) => {
    await expect(
      page.locator("[data-sonner-toast]").filter({
        hasText: "Error fetching exposure or data log!",
      }),
    ).toBeVisible({ timeout: 10000 });
  });

  test("table is empty", async ({ page }) => {
    await expect(page.locator("tbody tr")).toHaveCount(0);
  });

  test("page title is still visible (no crash)", async ({ page }) => {
    await expect(page.locator("[data-slot='card-title']")).toContainText(
      "Data Log:",
    );
  });
});

// ---------------------------------------------------------------------------
// exposure-entries endpoint fails (500)
// ---------------------------------------------------------------------------

test.describe("Data Log — exposure-entries endpoint 500", () => {
  test("error toast appears when exposure-entries fails", async ({ page }) => {
    await setupDataLogMocks(page);
    await page.route("**/nightlydigest/api/exposure-entries*", (route) =>
      route.fulfill({ status: 500, body: "Server Error" }),
    );
    await page.goto(DATA_LOG_URL);
    await page
      .getByRole("button", { name: "Reset Table" })
      .waitFor({ state: "visible", timeout: 15000 });
    await expect(
      page.locator("[data-sonner-toast]").filter({
        hasText: "Error fetching exposure or data log!",
      }),
    ).toBeVisible({ timeout: 10000 });
  });
});

// ---------------------------------------------------------------------------
// almanac endpoint fails (500)
// ---------------------------------------------------------------------------

test.describe("Data Log — almanac endpoint 500", () => {
  test.beforeEach(async ({ page }) => {
    await setupDataLogMocks(page);
    await page.route("**/nightlydigest/api/almanac*", (route) =>
      route.fulfill({ status: 500, body: "Server Error" }),
    );
    await page.goto(DATA_LOG_URL);
    await waitForDataLogLoad(page);
  });

  test("almanac error toast appears", async ({ page }) => {
    await expect(
      page.locator("[data-sonner-toast]").filter({
        hasText: "Error fetching almanac!",
      }),
    ).toBeVisible({ timeout: 10000 });
  });

  test("table still loads with ConsDB data", async ({ page }) => {
    await expect(page.locator("tbody tr")).toHaveCount(30);
  });
});

// ---------------------------------------------------------------------------
// almanac returns empty data
// ---------------------------------------------------------------------------

test.describe("Data Log — almanac empty", () => {
  test.beforeEach(async ({ page }) => {
    await setupDataLogMocks(page, { almanac: { almanac_info: null } });
    await page.goto(DATA_LOG_URL);
    await waitForDataLogLoad(page);
  });

  test("warning toast appears for missing almanac", async ({ page }) => {
    await expect(
      page.locator("[data-sonner-toast][data-type='warning']"),
    ).toBeVisible({ timeout: 10000 });
  });

  test("table still loads", async ({ page }) => {
    await expect(page.locator("tbody tr")).toHaveCount(30);
  });

  test("no crash — page title visible", async ({ page }) => {
    await expect(page.locator("[data-slot='card-title']")).toContainText(
      "Data Log:",
    );
  });
});
