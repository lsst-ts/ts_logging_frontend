import { test as base } from "@playwright/test";

// The SND dev server runs on localhost with the SND dev site's retention
// policy, so TEST_DAYOBS is only reachable with the clock pinned just after it.
// setFixedTime fakes Date only; timers keep running normally.
export const SND_NOW = new Date("2026-01-02T12:00:00Z");

export const test = base.extend({
  pinClock: [
    async ({ page }, use) => {
      await page.clock.setFixedTime(SND_NOW);
      await use();
    },
    { auto: true },
  ],
});

export { expect } from "@playwright/test";
