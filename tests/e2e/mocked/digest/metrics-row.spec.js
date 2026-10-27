// @ts-check
import { test, expect } from "@playwright/test";
import { recordRequests, setupApiMocks } from "../../helpers/mock-api.js";
import { DIGEST_URL } from "../../helpers/constants.js";
import {
  metricsRow,
  metricCard,
  tooltipForTrigger,
} from "../../helpers/digest-helpers.js";

import { NO_DATA_DISPLAY } from "@/constants/DATA_SOURCES";

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

  test("an empty Jira result shows zero without an availability warning", async ({
    page,
  }) => {
    await page.goto(DIGEST_URL);
    const card = metricCard(page, "Jira tickets created");
    await expect(card.locator("[data-slot='metrics-card-value']")).toHaveText(
      "0",
    );
    await expect(card).toContainText("(0 updated)");
    await expect(
      card.getByRole("button", {
        name: "data availability warning",
        exact: true,
      }),
    ).toHaveCount(0);
  });

  test("shows no-data placeholder for created and updated when Jira cannot be fetched", async ({
    page,
  }) => {
    await page.route("**/nightlydigest/api/jira-tickets*", (route) =>
      route.abort(),
    );
    await page.goto(DIGEST_URL);

    const card = metricCard(page, "Jira tickets created");
    await expect(card.locator("[data-slot='metrics-card-value']")).toHaveText(
      NO_DATA_DISPLAY,
    );
    await expect(card).toContainText(`(${NO_DATA_DISPLAY} updated)`);
    await expect(
      card.getByRole("button", { name: "data availability warning" }),
    ).toHaveCount(1);
  });

  test("shows no-data placeholder for nighttime exposures when exposures cannot be fetched", async ({
    page,
  }) => {
    await page.route("**/nightlydigest/api/exposures*", (route) =>
      route.abort(),
    );
    await page.goto(DIGEST_URL);

    await expect(
      metricCard(page, "Nighttime exposures taken").locator(
        "[data-slot='metrics-card-value']",
      ),
    ).toHaveText(NO_DATA_DISPLAY);
  });

  test("shows 0 and an availability warning for nighttime exposures when there are none", async ({
    page,
  }) => {
    await page.goto(DIGEST_URL);

    const card = metricCard(page, "Nighttime exposures taken");
    await expect(card.locator("[data-slot='metrics-card-value']")).toHaveText(
      "0",
    );
    const warning = card.getByRole("button", {
      name: "data availability warning",
    });
    await expect(warning).toBeVisible();
    await warning.hover();
    await expect(await tooltipForTrigger(page, warning)).toContainText(
      "No exposures found in ConsDB.",
    );
  });

  test("shows no-data placeholder expected when expected exposures cannot be fetched", async ({
    page,
  }) => {
    await page.route("**/nightlydigest/api/expected-exposures*", (route) =>
      route.abort(),
    );
    await page.goto(DIGEST_URL);

    await expect(metricCard(page, "Nighttime exposures taken")).toContainText(
      `(${NO_DATA_DISPLAY} expected)`,
    );
  });
});
