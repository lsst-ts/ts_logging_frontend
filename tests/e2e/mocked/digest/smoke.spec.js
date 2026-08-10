// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import { DIGEST_URL } from "../../helpers/constants.js";
import {
  observatoryStatusCard,
  waitForObservatoryStatusAppletLoad,
} from "../../helpers/digest-helpers.js";

test.describe("Digest page — smoke test", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await page.goto(DIGEST_URL);
    await waitForObservatoryStatusAppletLoad(page);
  });

  test("renders the Observatory Status applet", async ({ page }) => {
    const card = observatoryStatusCard(page);
    await expect(card.locator("[data-slot='card-title']")).toContainText(
      "Observatory Status",
    );
  });

  test("loads without console errors", async ({ page }) => {
    const consoleErrors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await setupApiMocks(page);
    await page.goto(DIGEST_URL);
    await waitForObservatoryStatusAppletLoad(page);

    await expect(
      observatoryStatusCard(page).locator("svg").first(),
    ).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });
});