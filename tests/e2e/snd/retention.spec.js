// @ts-check
import { test, expect } from "../helpers/snd-test.js";
import { setupApiMocks } from "../helpers/mock-api.js";

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
});
