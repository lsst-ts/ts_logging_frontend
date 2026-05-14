// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import { waitForPlotsLoad } from "../../helpers/plots-helpers.js";
import { PLOTS_URL } from "../../helpers/constants.js";

// ---------------------------------------------------------------------------

test.describe("Header — timeline toggle", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await page.goto(PLOTS_URL);
    await waitForPlotsLoad(page);
  });

  test("Hide Timeline button is visible by default", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: "Hide Timeline" }),
    ).toBeVisible();
  });

  test("clicking Hide Timeline removes the timeline chart and updates the button", async ({
    page,
  }) => {
    const initialChartCount = await page.locator(".recharts-surface").count();
    await page.getByRole("button", { name: "Hide Timeline" }).click();
    await expect(
      page.getByRole("button", { name: "Show Timeline" }),
    ).toBeVisible();
    await expect(page.locator(".recharts-surface")).toHaveCount(
      initialChartCount - 1,
    );
  });

  test("clicking Show Timeline restores the timeline chart and updates the button", async ({
    page,
  }) => {
    const initialChartCount = await page.locator(".recharts-surface").count();
    await page.getByRole("button", { name: "Hide Timeline" }).click();
    await page.getByRole("button", { name: "Show Timeline" }).click();
    await expect(
      page.getByRole("button", { name: "Hide Timeline" }),
    ).toBeVisible();
    await expect(page.locator(".recharts-surface")).toHaveCount(
      initialChartCount,
    );
  });
});

// ---------------------------------------------------------------------------

test.describe("Header — tips toggle", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await page.goto(PLOTS_URL);
    await waitForPlotsLoad(page);
  });

  test("both tips cards are hidden by default", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Timeline Tips" }),
    ).not.toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Plots Tips" }),
    ).not.toBeVisible();
  });

  test("clicking Show Tips shows both tips cards and updates the button", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Show Tips" }).click();
    await expect(page.getByRole("button", { name: "Hide Tips" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Timeline Tips" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Plots Tips" }),
    ).toBeVisible();
  });

  test("clicking Hide Tips hides both tips cards and updates the button", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Show Tips" }).click();
    await page.getByRole("button", { name: "Hide Tips" }).click();
    await expect(page.getByRole("button", { name: "Show Tips" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Timeline Tips" }),
    ).not.toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Plots Tips" }),
    ).not.toBeVisible();
  });
});
