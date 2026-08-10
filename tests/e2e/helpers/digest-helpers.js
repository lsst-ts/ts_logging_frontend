// @ts-check
import { expect } from "@playwright/test";

/**
 * Locator for the Observatory Status applet card on the Digest page.
 *
 * The applet is rendered as a Card whose CardTitle reads "Observatory Status".
 * Scoping assertions/interactions to this card keeps them independent of the
 * other applets on the page.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {import('@playwright/test').Locator}
 */
export function observatoryStatusCard(page) {
  return page.locator("[data-slot='card']").filter({
    hasText: "Observatory Status",
  });
}

/**
 * Waits until the Observatory Status applet has finished loading.
 *
 * The applet shows a skeleton while loading. Once loaded it either renders the
 * ECharts cumulative plot (an SVG) or, when no observatory-status data is
 * available, the "only available from ..." warning text. Waiting on either of
 * these signals is a reliable load sentinel.
 *
 * @param {import('@playwright/test').Page} page
 */
export async function waitForObservatoryStatusAppletLoad(page) {
  const card = observatoryStatusCard(page);
  await expect(
    card
      .locator("svg")
      .first()
      .or(card.getByText(/Observatory Status data is only available from/)),
  ).toBeVisible({ timeout: 15000 });
}

/**
 * Locator for the Observatory Status plot's tooltip.
 *
 * The tooltip is a DOM element rendered by ECharts from the custom formatter in
 * ObservatoryStatusCumulativePlot, using the `font-mono text-stone-100` classes
 * we control. Targeting these makes the assertion robust against ECharts'
 * internal tooltip markup.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {import('@playwright/test').Locator}
 */
export function observatoryStatusTooltip(page) {
  return page.locator("div.font-mono.text-stone-100").first();
}

/**
 * Hovers over a state marker in the cumulative plot so its tooltip appears.
 *
 * Markers are drawn by ECharts as SVG paths, so we position the mouse using the
 * marker's known semantics rather than fragile SVG internals: the marker for an
 * interval begins at its start hour (x positions align with the x-axis tick
 * labels) at a value of 0 (the bottom of the plot). We start from that estimated
 * point and nudge around it in a small grid — the chart's nearest-marker hit
 * detection has a ~5px radius, so a 4px step is guaranteed to land on it.
 *
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} svgLocator - The plot's SVG.
 * @param {string} hourLabel - x-axis tick label for the marker's start hour, e.g. "2:00".
 */
export async function hoverStateMarker(page, svgLocator, hourLabel) {
  const tooltip = observatoryStatusTooltip(page);
  // The applet sits low on the page; ensure the chart is actually on-screen so
  // page.mouse movements reach it.
  await svgLocator.scrollIntoViewIfNeeded();
  const svgBox = await svgLocator.boundingBox();

  const xTick = svgLocator.getByText(hourLabel, { exact: true }).first();
  await xTick.waitFor();
  const xBox = await xTick.boundingBox();

  // Markers start at cumulative value 0, which sits just above the axis tick text.
  const cx = xBox.x - svgBox.x + xBox.width / 2;
  const cy = xBox.y - svgBox.y + xBox.height / 2 - 12;

  for (let dy = -8; dy <= 8; dy += 4) {
    for (let dx = -12; dx <= 12; dx += 4) {
      await page.mouse.move(svgBox.x + cx + dx, svgBox.y + cy + dy);
      // ECharts renders the tooltip asynchronously after the mousemove, so give
      // it a moment before checking whether it appeared.
      await page.waitForTimeout(60);
      if ((await tooltip.count()) > 0) return;
    }
  }
}
