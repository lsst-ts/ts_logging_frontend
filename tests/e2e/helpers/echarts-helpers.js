// @ts-check
import { expect } from "@playwright/test";

/**
 * Asserts that at least one ECharts plot on the page is showing a no-data
 * message with the given text.
 *
 * The no-data message is drawn by ECharts as a graphic text element on the
 * chart canvas, so it is not reachable via text selectors. This scans every
 * mounted ECharts instance (accessible via the `__echartsInstance` property
 * ECharts' echarts.init attaches to its container) for a graphic element
 * with id `no-data-message` whose text matches.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} text - The expected no-data message text.
 */
export async function expectNoDataMessageInPlots(page, text) {
  await expect
    .poll(async () => {
      return page.evaluate(() => {
        const found = [];
        for (const el of document.querySelectorAll("div")) {
          const inst = el && el.__echartsInstance;
          if (!inst) continue;
          const graphic = inst.getOption().graphic || [];
          const all = Array.isArray(graphic) ? graphic : [graphic];
          const scan = (arr) => {
            for (const item of arr) {
              if (item && item.elements) scan(item.elements);
              if (
                item &&
                item.id === "no-data-message" &&
                item.style &&
                typeof item.style.text === "string"
              ) {
                found.push(item.style.text);
              }
            }
          };
          scan(all);
        }
        return found;
      });
    })
    .toEqual(expect.arrayContaining([text]));
}
