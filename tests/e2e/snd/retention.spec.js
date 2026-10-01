// @ts-check
import { test, expect } from "../helpers/snd-test.js";
import { setupApiMocks } from "../helpers/mock-api.js";
import { DIGEST_URL } from "../helpers/constants.js";

// On localhost the SND takes the SND dev site's 7-day retention policy, where
// the internal app has none.
test.describe("Scientific Nightly Digest — retention policy", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });

  test("rejects a dayobs older than the 7-day window", async ({ page }) => {
    await page.goto(
      "/nightlydigest/?startDayobs=20251201&endDayobs=20251201&telescope=Simonyi",
    );

    await expect(page.getByText("Something went wrong")).toBeVisible();
    await expect(
      page.getByText(/must be within the last 7 days/i),
    ).toBeVisible();
  });

  test("shows no retention banner", async ({ page }) => {
    await page.goto(DIGEST_URL);

    await expect(page.locator("[data-slot='navigation-menu']")).toBeVisible();
    await expect(page.getByText(/data is only retained for/i)).toHaveCount(0);
  });

  test("the dayobs and nights inputs describe the window", async ({ page }) => {
    await page.goto(DIGEST_URL);

    await expect(page.getByLabel("Night (dayobs)")).toHaveAccessibleDescription(
      "*within the previous 7 nights",
    );
    await expect(
      page.getByLabel("Number of Nights"),
    ).toHaveAccessibleDescription(
      "≤7 nights up to and including the selected dayobs",
    );
  });
});
