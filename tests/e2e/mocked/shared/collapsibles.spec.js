// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import { waitForPlotsLoad } from "../../helpers/plots-helpers.js";
import { waitForDataLogLoad } from "../../helpers/data-log-helpers.js";
import { PLOTS_URL, DATA_LOG_URL } from "../../helpers/constants.js";

const PAGES = [
  {
    name: "Plots",
    url: PLOTS_URL,
    waitForLoad: waitForPlotsLoad,
  },
  {
    name: "DataLog",
    url: DATA_LOG_URL,
    waitForLoad: waitForDataLogLoad,
  },
  // TODO: add ContextFeed when its test infrastructure is ready
];

for (const { name, url, waitForLoad } of PAGES) {
  test.describe(`${name} page — timeline collapsible`, () => {
    test.beforeEach(async ({ page }) => {
      await setupApiMocks(page);
      await page.goto(url);
      await waitForLoad(page);
    });

    test("timeline is visible by default", async ({ page }) => {
      await expect(page.locator(".recharts-surface").first()).toBeVisible();
    });

    test('"Hide Timeline" button is visible', async ({ page }) => {
      await expect(
        page.getByRole("button", { name: "Hide Timeline" }),
      ).toBeVisible();
    });

    test('clicking "Hide Timeline" hides the chart', async ({ page }) => {
      // On pages with multiple charts (e.g. Plots), other recharts-surface elements
      // remain visible — verify via count drop rather than visibility of .first().
      const initial = await page.locator(".recharts-surface").count();
      await page.getByRole("button", { name: "Hide Timeline" }).click();
      await expect(page.locator(".recharts-surface")).toHaveCount(initial - 1);
    });

    test('button text changes to "Show Timeline" after hiding', async ({
      page,
    }) => {
      await page.getByRole("button", { name: "Hide Timeline" }).click();
      await expect(
        page.getByRole("button", { name: "Show Timeline" }),
      ).toBeVisible();
    });

    test('clicking "Show Timeline" restores the chart', async ({ page }) => {
      const initial = await page.locator(".recharts-surface").count();
      await page.getByRole("button", { name: "Hide Timeline" }).click();
      await expect(page.locator(".recharts-surface")).toHaveCount(initial - 1);
      await page.getByRole("button", { name: "Show Timeline" }).click();
      await expect(page.locator(".recharts-surface")).toHaveCount(initial);
    });

    test('button text changes back to "Hide Timeline" after restoring', async ({
      page,
    }) => {
      await page.getByRole("button", { name: "Hide Timeline" }).click();
      await page.getByRole("button", { name: "Show Timeline" }).click();
      await expect(
        page.getByRole("button", { name: "Hide Timeline" }),
      ).toBeVisible();
    });
  });

  test.describe(`${name} page — tips collapsible`, () => {
    test.beforeEach(async ({ page }) => {
      await setupApiMocks(page);
      await page.goto(url);
      await waitForLoad(page);
    });

    test("tips card is visible by default", async ({ page }) => {
      await expect(
        page.locator("h2").filter({ hasText: "Timeline Tips" }),
      ).toBeVisible();
    });

    test('"Hide Tips" button is visible', async ({ page }) => {
      await expect(
        page.getByRole("button", { name: "Hide Tips" }),
      ).toBeVisible();
    });

    test('clicking "Hide Tips" hides the tips card', async ({ page }) => {
      await page.getByRole("button", { name: "Hide Tips" }).click();
      await expect(
        page.locator("h2").filter({ hasText: "Timeline Tips" }),
      ).not.toBeVisible();
    });

    test('button text changes to "Show Tips" after hiding', async ({
      page,
    }) => {
      await page.getByRole("button", { name: "Hide Tips" }).click();
      await expect(
        page.getByRole("button", { name: "Show Tips" }),
      ).toBeVisible();
    });

    test('clicking "Show Tips" restores the tips card', async ({ page }) => {
      await page.getByRole("button", { name: "Hide Tips" }).click();
      await page.getByRole("button", { name: "Show Tips" }).click();
      await expect(
        page.locator("h2").filter({ hasText: "Timeline Tips" }),
      ).toBeVisible();
    });
  });

  test.describe(`${name} page — collapsible independence`, () => {
    test.beforeEach(async ({ page }) => {
      await setupApiMocks(page);
      await page.goto(url);
      await waitForLoad(page);
    });

    test("hiding timeline does not hide tips", async ({ page }) => {
      await page.getByRole("button", { name: "Hide Timeline" }).click();
      await expect(
        page.locator("h2").filter({ hasText: "Timeline Tips" }),
      ).toBeVisible();
    });

    test("hiding tips does not hide timeline", async ({ page }) => {
      await page.getByRole("button", { name: "Hide Tips" }).click();
      await expect(page.locator(".recharts-surface").first()).toBeVisible();
    });

    test("both can be hidden simultaneously", async ({ page }) => {
      const initial = await page.locator(".recharts-surface").count();
      await page.getByRole("button", { name: "Hide Timeline" }).click();
      await page.getByRole("button", { name: "Hide Tips" }).click();
      await expect(page.locator(".recharts-surface")).toHaveCount(initial - 1);
      await expect(
        page.locator("h2").filter({ hasText: "Timeline Tips" }),
      ).not.toBeVisible();
    });

    test("both can be restored after being hidden", async ({ page }) => {
      const initial = await page.locator(".recharts-surface").count();
      await page.getByRole("button", { name: "Hide Timeline" }).click();
      await page.getByRole("button", { name: "Hide Tips" }).click();
      await page.getByRole("button", { name: "Show Timeline" }).click();
      await page.getByRole("button", { name: "Show Tips" }).click();
      await expect(page.locator(".recharts-surface")).toHaveCount(initial);
      await expect(
        page.locator("h2").filter({ hasText: "Timeline Tips" }),
      ).toBeVisible();
    });
  });
}
