// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../helpers/mock-api.js";
import {
  DIGEST_URL,
  DATALOG_URL,
  PLOTS_URL,
  CONTEXTFEED_URL,
} from "../helpers/constants.js";
import { waitForDataLogLoad } from "../helpers/datalog-helpers.js";
import { waitForPlotsLoad } from "../helpers/plots-helpers.js";
import { waitForObservatoryStatusAppletLoad } from "../helpers/digest-helpers.js";

const contextFeedMenuItem = (page) =>
  page.getByRole("menuitem", { name: "View Context Feed" });

test.describe("Scientific Nightly Digest — the Context Feed is absent", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });

  test("the nav menu has no Context Feed link", async ({ page }) => {
    await page.goto(DIGEST_URL);

    await expect(page.getByRole("link", { name: "Plots" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Context Feed" })).toHaveCount(
      0,
    );
  });

  test("the context-feed URL does not render the page", async ({ page }) => {
    await page.goto(CONTEXTFEED_URL);

    // No route matches the path, so the router falls through to Not Found.
    await expect(page.getByText("Not Found")).toBeVisible();
    // PageHeader renders the title in a span rather than a heading, so match
    // the page's own description text instead.
    await expect(
      page.getByText("Chronologically ordered log of exposures"),
    ).toHaveCount(0);
  });

  test("the data-log timeline menu offers no Context Feed", async ({
    page,
  }) => {
    await page.goto(DATALOG_URL);
    await waitForDataLogLoad(page);
    await page.locator("canvas").first().click({ button: "right" });

    await expect(
      page.getByRole("menuitem", { name: "View Plots" }),
    ).toBeVisible();
    await expect(contextFeedMenuItem(page)).toHaveCount(0);
  });

  test("the plots timeline menu offers no Context Feed", async ({ page }) => {
    await page.goto(PLOTS_URL);
    await waitForPlotsLoad(page);
    await page.locator("canvas").first().click({ button: "right" });

    await expect(
      page.getByRole("menuitem", { name: "View Data Log" }),
    ).toBeVisible();
    await expect(contextFeedMenuItem(page)).toHaveCount(0);
  });

  test("the observing conditions applet menu offers no Context Feed", async ({
    page,
  }) => {
    await page.goto(DIGEST_URL);
    await waitForObservatoryStatusAppletLoad(page);

    const applet = page
      .locator("[data-slot='card']")
      .filter({ hasText: "Observing Conditions" });
    await applet.locator("[data-slot='chart']").first().click({
      button: "right",
    });

    await expect(
      page.getByRole("menuitem", { name: "View Plots" }),
    ).toBeVisible();
    await expect(contextFeedMenuItem(page)).toHaveCount(0);
  });
});
