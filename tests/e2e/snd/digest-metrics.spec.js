// @ts-check
import { test, expect } from "@playwright/test";
import { recordRequests, setupApiMocks } from "../helpers/mock-api.js";
import { DIGEST_URL } from "../helpers/constants.js";
import { metricsRow, metricCard } from "../helpers/digest-helpers.js";

test.describe("Scientific Nightly Digest — metrics row", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });

  // The internal counterpart is tests/e2e/mocked/digest/metrics-row.spec.js.
  test("the Jira tickets card is absent", async ({ page }) => {
    await page.goto(DIGEST_URL);

    await expect(page.getByText("Jira tickets created")).toHaveCount(0);
    await expect(metricsRow(page).locator("> div")).toHaveCount(3);
  });

  test("Jira tickets are never fetched", async ({ page }) => {
    const requests = await recordRequests(page, "jira-tickets");

    await page.goto(DIGEST_URL);
    // The neighbouring card settling means the row's fetches have run.
    await expect(metricCard(page, "Nighttime exposures taken")).toBeVisible();

    expect(requests).toEqual([]);
  });

  test("the remaining three cards expand to fill the row", async ({ page }) => {
    await page.goto(DIGEST_URL);

    const row = await metricsRow(page).boundingBox();
    const card = await metricCard(
      page,
      "Nighttime exposures taken",
    ).boundingBox();

    // A quarter-width card would be under 25%; a third is comfortably over 30%.
    expect(card.width).toBeGreaterThan(row.width * 0.3);
  });
});
