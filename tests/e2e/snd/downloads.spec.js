// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../helpers/mock-api.js";
import { DATALOG_URL, DIGEST_URL, PLOTS_URL } from "../helpers/constants.js";
import {
  appletCard,
  waitForObservatoryStatusAppletLoad,
} from "../helpers/digest-helpers.js";
import { waitForDataLogLoad } from "../helpers/datalog-helpers.js";
import { waitForPlotsLoad } from "../helpers/plots-helpers.js";

// The internal counterparts are the download specs under tests/e2e/mocked/.
const downloadButtons = (page) =>
  page.getByRole("button", { name: /^Download (CSV|TXT)$/ });

test.describe("Scientific Nightly Digest — downloads", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });

  test("the digest applets have no download button", async ({ page }) => {
    await page.goto(DIGEST_URL);
    await waitForObservatoryStatusAppletLoad(page);
    await expect(appletCard(page, "Observing Conditions")).toBeVisible();
    await expect(appletCard(page, "Exposure Breakdown")).toBeVisible();

    await expect(downloadButtons(page)).toHaveCount(0);
  });

  test("the data log has no download button", async ({ page }) => {
    await page.goto(DATALOG_URL);
    await waitForDataLogLoad(page);

    await expect(downloadButtons(page)).toHaveCount(0);
  });

  test("the plots page has no download button", async ({ page }) => {
    await page.goto(PLOTS_URL);
    await waitForPlotsLoad(page);

    await expect(downloadButtons(page)).toHaveCount(0);
  });
});
