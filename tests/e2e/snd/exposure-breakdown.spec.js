// @ts-check
import { test, expect } from "@playwright/test";
import { recordRequests, setupApiMocks } from "../helpers/mock-api.js";
import { generateExposuresMock } from "../helpers/mock-generators.js";
import { DIGEST_URL } from "../helpers/constants.js";
import { appletCard, openAppletInfo } from "../helpers/digest-helpers.js";

const BLOCK_LOOKUP = {
  data: {
    "BLOCK-320": {
      url: "https://rubinobs.atlassian.net/browse/BLOCK-320",
      summary: "Test block",
    },
  },
  errors: null,
};

test.describe("Scientific Nightly Digest — exposure breakdown", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });

  // The internal counterpart is
  // tests/e2e/mocked/digest/exposure-breakdown.spec.js.
  test("groups by image type by default", async ({ page }) => {
    await page.goto(DIGEST_URL);

    await expect(page.locator("#groupBy")).toHaveText("Img. type");
  });

  test("the other groupings are still selectable", async ({ page }) => {
    await page.goto(DIGEST_URL);

    await page.locator("#groupBy").click();
    await page.getByRole("option", { name: "Science program" }).click();

    await expect(page.locator("#groupBy")).toHaveText("Science program");
  });

  // Exposures carrying a science_program are what would trigger the fetch; the
  // default fixture has none, so the assertion would hold either way.
  test("BLOCK details are never fetched", async ({ page }) => {
    await setupApiMocks(page, { exposures: generateExposuresMock(4) });
    const requests = await recordRequests(page, "block-details");

    await page.goto(DIGEST_URL);
    await expect(appletCard(page, "Exposure Breakdown")).toBeVisible();
    await expect(page.locator(".recharts-bar-rectangle").first()).toBeVisible();

    expect(requests).toEqual([]);
  });

  // Even with a BLOCK lookup available, Science Program labels stay plain text
  // because nothing populates it. The internal spec links the same label.
  test("science program labels are not links", async ({ page }) => {
    await setupApiMocks(page, {
      exposures: generateExposuresMock(4),
      "block-details": BLOCK_LOOKUP,
    });
    await page.goto(DIGEST_URL);

    await page.locator("#groupBy").click();
    await page.getByRole("option", { name: "Science program" }).click();

    // The bars themselves are anchors to the Data Log, so this checks the tick
    // label specifically: BarChartYAxisTick wraps it in an <a> when linked.
    const tick = appletCard(page, "Exposure Breakdown")
      .locator("text")
      .filter({ hasText: "BLOCK-320" })
      .first();
    await expect(tick).toBeVisible();
    expect(
      await tick.evaluate((el) => el.parentElement.tagName.toLowerCase()),
    ).not.toBe("a");
  });

  test("the info popover does not mention BLOCK links", async ({ page }) => {
    await page.goto(DIGEST_URL);
    await openAppletInfo(page, "Exposure Breakdown");

    await expect(page.getByText(/Hover over a bar/)).toBeVisible();
    await expect(page.getByText(/BLOCK documentation/)).toHaveCount(0);
  });
});
