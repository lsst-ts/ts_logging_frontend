// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../helpers/mock-api.js";
import { DIGEST_URL, TEST_DAYOBS } from "../helpers/constants.js";

test.describe("Scientific Nightly Digest — Simonyi only", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });

  // The internal build's selector, with its AuxTel option, is covered by
  // tests/e2e/mocked/datalog/time-and-scope.spec.js.
  test("the sidebar has no telescope selector", async ({ page }) => {
    await page.goto(DIGEST_URL);

    await expect(page.locator("#noOfNights")).toBeVisible();
    await expect(page.locator("#instrument")).toHaveCount(0);
    await expect(page.getByText("Telescope", { exact: true })).toHaveCount(0);
  });

  test("telescope=AuxTel in the URL is rejected", async ({ page }) => {
    await page.goto(
      `/nightlydigest/?startDayobs=${TEST_DAYOBS}&endDayobs=${TEST_DAYOBS}&telescope=AuxTel`,
    );

    await expect(page.getByText("Something went wrong")).toBeVisible();
    await expect(page.getByText(/^telescope:/)).toBeVisible();
  });
});
