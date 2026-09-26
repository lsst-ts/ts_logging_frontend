// @ts-check
import { test, expect } from "@playwright/test";
import { recordRequests, setupApiMocks } from "../../helpers/mock-api.js";
import { DIGEST_URL } from "../../helpers/constants.js";
import { metricsRow, metricCard } from "../../helpers/digest-helpers.js";

test.describe("Digest page — metrics row", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });

  // The Scientific Nightly Digest drops the Jira card and widens the rest; see
  // tests/e2e/snd/digest-metrics.spec.js.
  test("shows four cards including Jira tickets", async ({ page }) => {
    await page.goto(DIGEST_URL);

    await expect(metricCard(page, "Jira tickets created")).toBeVisible();
    await expect(metricsRow(page).locator("> div")).toHaveCount(4);
  });

  test("the Jira tickets are fetched", async ({ page }) => {
    const requests = await recordRequests(page, "jira-tickets");

    await page.goto(DIGEST_URL);
    await expect(metricCard(page, "Jira tickets created")).toBeVisible();

    expect(requests.length).toBeGreaterThan(0);
  });

  test("the four cards each take a quarter of the row", async ({ page }) => {
    await page.goto(DIGEST_URL);

    const row = await metricsRow(page).boundingBox();
    const card = await metricCard(
      page,
      "Nighttime exposures taken",
    ).boundingBox();

    expect(card.width).toBeLessThan(row.width * 0.3);
  });
});
