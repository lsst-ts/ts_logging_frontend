// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import { DIGEST_URL } from "../../helpers/constants.js";

test.describe("Digest page — exposure breakdown", () => {
  // The Scientific Nightly Digest defaults this to image type instead; see
  // tests/e2e/snd/exposure-breakdown.spec.js.
  test("groups by science program by default", async ({ page }) => {
    await setupApiMocks(page);
    await page.goto(DIGEST_URL);

    await expect(page.locator("#groupBy")).toHaveText("Science program");
  });
});
