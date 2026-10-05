// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import { DIGEST_URL } from "../../helpers/constants.js";
import { waitForObservatoryStatusAppletLoad } from "../../helpers/digest-helpers.js";

test.describe("Digest page — Observing Conditions context menu", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await page.goto(DIGEST_URL);
    await waitForObservatoryStatusAppletLoad(page);
  });

  // The Scientific Nightly Digest drops "View Context Feed" from this menu
  // (tests/e2e/snd/context-feed.spec.js); this is the internal counterpart, so
  // a renamed or removed item fails on whichever side it breaks.
  test("right-click on the chart shows the navigation menu items", async ({
    page,
  }) => {
    const applet = page
      .locator("[data-slot='card']")
      .filter({ hasText: "Observing Conditions" });
    await applet
      .locator("[data-slot='chart']")
      .first()
      .click({ button: "right" });

    await expect(
      page.getByRole("menuitem", { name: "View Context Feed" }),
    ).toBeVisible();
    await expect(
      page.getByRole("menuitem", { name: "View Plots" }),
    ).toBeVisible();
    await expect(
      page.getByRole("menuitem", { name: "View Data Log" }),
    ).toBeVisible();
  });
});
