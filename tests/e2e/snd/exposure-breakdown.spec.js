// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../helpers/mock-api.js";
import { DIGEST_URL } from "../helpers/constants.js";

test.describe("Scientific Nightly Digest — exposure breakdown", () => {
  // The internal counterpart is
  // tests/e2e/mocked/digest/exposure-breakdown.spec.js.
  test("groups by image type by default", async ({ page }) => {
    await setupApiMocks(page);
    await page.goto(DIGEST_URL);

    await expect(page.locator("#groupBy")).toHaveText("Img. type");
  });

  test("the other groupings are still selectable", async ({ page }) => {
    await setupApiMocks(page);
    await page.goto(DIGEST_URL);

    await page.locator("#groupBy").click();
    await page.getByRole("option", { name: "Science program" }).click();

    await expect(page.locator("#groupBy")).toHaveText("Science program");
  });
});
