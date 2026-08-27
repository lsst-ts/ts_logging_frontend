// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../helpers/mock-api.js";
import { DIGEST_URL, PLOTS_URL, TEST_DAYOBS } from "../helpers/constants.js";

const nav = (page) => page.locator("[data-slot='navigation-menu']");

// The Scientific Nightly Digest drops the Context Feed, so these four are the
// whole menu.
const SND_ITEMS = ["Nightly Digest", "Plots", "Data Log", "Visit Maps"];

test.describe("Scientific Nightly Digest — nav menu", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });

  test("lists exactly the four pages the variant has", async ({ page }) => {
    await page.goto(PLOTS_URL);

    for (const item of SND_ITEMS) {
      await expect(nav(page).getByText(item, { exact: true })).toBeVisible();
    }
    await expect(nav(page).getByText("Context Feed")).toHaveCount(0);
    await expect(nav(page).locator("li")).toHaveCount(SND_ITEMS.length);
  });

  test("the current page is plain text, the others are links", async ({
    page,
  }) => {
    await page.goto(PLOTS_URL);

    await expect(nav(page).getByRole("link", { name: "Plots" })).toHaveCount(0);
    await expect(nav(page).getByRole("link")).toHaveCount(SND_ITEMS.length - 1);
  });

  test("navigating from the menu keeps the search params", async ({ page }) => {
    await page.goto(DIGEST_URL);
    await nav(page).getByRole("link", { name: "Data Log" }).click();

    await expect(page).toHaveURL(/\/nightlydigest\/data-log/);
    await expect(page).toHaveURL(new RegExp(`startDayobs=${TEST_DAYOBS}`));
    await expect(page).toHaveURL(/telescope=Simonyi/);
  });
});
