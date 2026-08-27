// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../helpers/mock-api.js";
import { DIGEST_URL } from "../helpers/constants.js";
import {
  appletCard,
  waitForObservatoryStatusAppletLoad,
} from "../helpers/digest-helpers.js";

test.describe("Scientific Nightly Digest — digest applets", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await page.goto(DIGEST_URL);
    await waitForObservatoryStatusAppletLoad(page);
  });

  // The internal counterpart is tests/e2e/mocked/digest/applet-row.spec.js.
  test("the night report applet is absent", async ({ page }) => {
    await expect(page.getByText(/^Night Reports?$/)).toHaveCount(0);
  });

  test("observatory status and visit map expand to half the row each", async ({
    page,
  }) => {
    const obsStatus = await appletCard(
      page,
      "Observatory Status",
    ).boundingBox();
    const visitMap = await appletCard(page, "Visit Map").boundingBox();
    // The row above is always two applets wide, so it is the yardstick for a
    // half-width card.
    const halfWidth = await appletCard(
      page,
      "Observing Conditions",
    ).boundingBox();

    expect(Math.abs(obsStatus.y - visitMap.y)).toBeLessThan(2);
    expect(Math.abs(obsStatus.width - visitMap.width)).toBeLessThan(2);
    expect(Math.abs(obsStatus.width - halfWidth.width)).toBeLessThan(2);
  });
});
