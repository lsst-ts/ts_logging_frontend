// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import { PLOTS_URL } from "../../helpers/constants.js";
import { waitForPlotsLoad } from "../../helpers/plots-helpers.js";

test.describe("Plots page — timeline context menu", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await page.goto(PLOTS_URL);
    await waitForPlotsLoad(page);
  });

  // The Scientific Nightly Digest drops "View Context Feed" from this menu
  // (tests/e2e/snd/context-feed.spec.js); this is the internal counterpart, so
  // a renamed or removed item fails on whichever side it breaks.
  test("right-click on the timeline shows the navigation menu items", async ({
    page,
  }) => {
    await page.locator("canvas").first().click({ button: "right" });

    await expect(
      page.getByRole("menuitem", { name: "View Context Feed" }),
    ).toBeVisible();
    await expect(
      page.getByRole("menuitem", { name: "View Data Log" }),
    ).toBeVisible();
  });

  test("View Context Feed navigates preserving the search params", async ({
    page,
  }) => {
    await page.locator("canvas").first().click({ button: "right" });
    await page.getByRole("menuitem", { name: "View Context Feed" }).click();

    await expect(page).toHaveURL(/\/nightlydigest\/context-feed/);
    await expect(page).toHaveURL(/startDayobs=20260101/);
    await expect(page).toHaveURL(/telescope=Simonyi/);
  });
});
