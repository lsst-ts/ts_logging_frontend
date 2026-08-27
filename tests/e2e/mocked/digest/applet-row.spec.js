// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import { DIGEST_URL } from "../../helpers/constants.js";
import {
  appletCard,
  waitForObservatoryStatusAppletLoad,
} from "../../helpers/digest-helpers.js";

test.describe("Digest page — bottom applet row", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await page.goto(DIGEST_URL);
    await waitForObservatoryStatusAppletLoad(page);
  });

  // The Scientific Nightly Digest drops the night report and widens the other
  // two; see tests/e2e/snd/digest-applets.spec.js.
  test("shows the night report alongside observatory status and the visit map", async ({
    page,
  }) => {
    const nightReport = await appletCard(page, "Night Report").boundingBox();
    const obsStatus = await appletCard(
      page,
      "Observatory Status",
    ).boundingBox();
    const visitMap = await appletCard(page, "Visit Map").boundingBox();

    for (const box of [obsStatus, visitMap]) {
      expect(Math.abs(nightReport.y - box.y)).toBeLessThan(2);
      expect(Math.abs(nightReport.width - box.width)).toBeLessThan(2);
    }
  });

  test("the row is three columns, narrower than the two-up row above", async ({
    page,
  }) => {
    const obsStatus = await appletCard(
      page,
      "Observatory Status",
    ).boundingBox();
    const halfWidth = await appletCard(
      page,
      "Observing Conditions",
    ).boundingBox();

    expect(obsStatus.width).toBeLessThan(halfWidth.width * 0.75);
  });
});
