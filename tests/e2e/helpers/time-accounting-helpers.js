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
