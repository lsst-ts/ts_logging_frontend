// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import { VISITMAPS_URL } from "../../helpers/constants.js";

const NO_DATA_TEXT = "No visit map data available";

test.describe("Visit Maps page — loading state", () => {
  test("shows a skeleton while the visit maps request is pending", async ({
    page,
  }) => {
    await setupApiMocks(page);
    // Keep the visit maps request pending (never fulfilled) so the page stays
    // in its loading state. Registered after setupApiMocks so it takes
    // precedence (Playwright evaluates routes LIFO).
    await page.route("**/nightlydigest/api/multi-night-visit-maps*", () => {});

    await page.goto(VISITMAPS_URL);

    // PageHeader uses CardTitle (a div, not a heading element); the page
    // header is the first of the two on the page.
    await expect(
      page.locator("[data-slot='card-title']").first(),
    ).toContainText("Visit Maps");
    await expect(page.locator("[data-slot='skeleton']")).toBeVisible();
    // The loading skeleton stands in for the map, so the empty-state message
    // must not be showing while the fetch is still in flight.
    await expect(page.getByText(NO_DATA_TEXT)).not.toBeVisible();
  });

  test("replaces the skeleton with the empty state once the fetch settles", async ({
    page,
  }) => {
    await setupApiMocks(page);
    await page.goto(VISITMAPS_URL);

    await expect(page.getByText(NO_DATA_TEXT)).toBeVisible();
    await expect(page.locator("[data-slot='skeleton']")).toHaveCount(0);
  });
});
