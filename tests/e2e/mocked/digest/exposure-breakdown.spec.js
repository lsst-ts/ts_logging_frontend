// @ts-check
import { test, expect } from "@playwright/test";
import { recordRequests, setupApiMocks } from "../../helpers/mock-api.js";
import { generateExposuresMock } from "../../helpers/mock-generators.js";
import { DIGEST_URL } from "../../helpers/constants.js";
import { openAppletInfo } from "../../helpers/digest-helpers.js";

test.describe("Digest page — exposure breakdown", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await page.goto(DIGEST_URL);
  });

  // The Scientific Nightly Digest defaults this to image type instead, and
  // drops the BLOCK links; see tests/e2e/snd/exposure-breakdown.spec.js.
  test("groups by science program by default", async ({ page }) => {
    await expect(page.locator("#groupBy")).toHaveText("Science program");
  });

  test("the info popover explains the BLOCK links", async ({ page }) => {
    await openAppletInfo(page, "Exposure Breakdown");

    await expect(page.getByText(/BLOCK documentation/)).toBeVisible();
  });

  // SND renders the same label as plain text; see
  // tests/e2e/snd/exposure-breakdown.spec.js.
  test("science program labels link to the BLOCK documentation", async ({
    page,
  }) => {
    await setupApiMocks(page, {
      exposures: generateExposuresMock(4),
      "block-details": {
        data: {
          "BLOCK-320": {
            url: "https://rubinobs.atlassian.net/browse/BLOCK-320",
            summary: "Test block",
          },
        },
        errors: null,
      },
    });
    await page.goto(DIGEST_URL);

    const tick = page.locator("text").filter({ hasText: "BLOCK-320" }).first();
    await expect(tick).toBeVisible();
    const link = tick.locator("xpath=parent::*");
    await expect(link).toHaveAttribute(
      "href",
      "https://rubinobs.atlassian.net/browse/BLOCK-320",
    );
  });

  // SND skips this fetch; tests/e2e/snd/exposure-breakdown.spec.js asserts its
  // absence against the same exposures, which is what keeps that honest.
  test("BLOCK details are fetched for the science programs on show", async ({
    page,
  }) => {
    await setupApiMocks(page, { exposures: generateExposuresMock(4) });
    const requests = await recordRequests(page, "block-details");

    await page.goto(DIGEST_URL);
    await expect(page.locator(".recharts-bar-rectangle").first()).toBeVisible();

    expect(requests.length).toBeGreaterThan(0);
  });
});
