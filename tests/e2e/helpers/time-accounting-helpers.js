// @ts-check
import { expect } from "@playwright/test";

/**
 * Waits for the Time Accounting page to finish loading.
 *
 * The observatory-status timeline chart is only rendered once the
 * obs-status (and Almanac) requests have settled, making it a reliable
 * load sentinel.
 *
 * @param {import('@playwright/test').Page} page
 */
export async function waitForTimeAccountingLoad(page) {
  await expect(
    page.locator('[data-slot="obs-status-timeline"]').first(),
  ).toBeVisible({ timeout: 15000 });
}

/**
 * Locator for the Exposure Time Accounting applet card on the Time Accounting
 * page, matched on its title.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {import('@playwright/test').Locator}
 */
export function exposureTimeAccountingCard(page) {
  return page.locator("[data-slot='card']").filter({
    hasText: "Exposure Time Accounting",
  });
}

/**
 * Locator for the Narrative Log applet card on the Time Accounting page,
 * matched on its title.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {import('@playwright/test').Locator}
 */
export function narrativeLogCard(page) {
  return page.locator("[data-slot='card']").filter({
    hasText: "Narrative Log Entries with Fault Time Loss",
  });
}

/**
 * Opens the Exposure Time Accounting applet's info popover.
 *
 * The applet header's two icon-only popover triggers (download then info) have
 * no accessible names, so the info one is the second header button.
 *
 * @param {import('@playwright/test').Page} page
 */
export async function openExposureTimeAccountingInfo(page) {
  await exposureTimeAccountingCard(page)
    .locator("[data-slot='card-header'] button")
    .nth(1)
    .click();
}
