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
 * Locator for the metrics row at the top of the Digest page.
 *
 * It is the first grid on the page; the applet rows follow it.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {import('@playwright/test').Locator}
 */
export function metricsRow(page) {
  return page.locator("div.grid").first();
}

/**
 * Locator for a metric card, matched on its label.
 *
 * MetricsCard renders a plain div rather than a Card, so the card is reached as
 * a direct child of the metrics grid.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} label - The card's label, e.g. "Jira tickets created".
 * @returns {import('@playwright/test').Locator}
 */
export function metricCard(page, label) {
  return metricsRow(page).locator("> div").filter({ hasText: label }).first();
}

/**
 * Locator for an applet card on the Digest page, matched on its CardTitle.
 *
 * Matching the title rather than the whole card avoids picking up metric cards
 * that merely mention an applet's name in a tooltip.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} title - The applet's CardTitle text, e.g. "Visit Map".
 * @returns {import('@playwright/test').Locator}
 */
export function appletCard(page, title) {
  return page
    .locator("[data-slot='card']")
    .filter({
      has: page.locator("[data-slot='card-title']", { hasText: title }),
    })
    .first();
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
 * labels) at a value of 0 (the bottom of the plot).
 *
 * The set of x-axis tick labels ECharts actually renders varies with the chart's
 * width (axisLabel.hideOverlap drops labels that don't fit), so we must not
 * assume a specific label (e.g. "2:00") exists. Instead we read whichever
 * numeric tick labels were rendered, use the target hour directly if present,
 * and otherwise interpolate (or extrapolate, using the measured hour spacing)
 * between the rendered neighbours to locate the target hour's pixel position.
 * We then nudge around that estimated point in a small grid — the chart's
 * nearest-marker hit detection has a ~5px radius, so a 4px step is guaranteed
 * to land on it.
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

  const targetHour = parseInt(hourLabel, 10);

  // Read the rendered x-axis tick labels and their page positions in one pass
  // (window.scroll* added so the result is page-relative, matching page.mouse).
  const { ticks } = await svgLocator.evaluate((svg) => {
    const tickPos = (el) => {
      const r = el.getBoundingClientRect();
      // getBoundingClientRect() is viewport-relative, which matches the
      // coordinate space used by page.mouse/boundingBox().
      return {
        x: r.left + r.width / 2,
        y: r.top + r.height / 2,
      };
    };

    const found = [];
    for (const el of svg.querySelectorAll("text")) {
      const text = (el.textContent ?? "").trim();
      const match = /^(\d{1,2}):\d{2}$/.exec(text);
      if (!match) continue;
      found.push({ hour: Number(match[1]), ...tickPos(el) });
    }
    return { ticks: found };
  });

  if (ticks.length === 0) {
    throw new Error(
      "hoverStateMarker: no numeric x-axis tick labels found in the Observatory Status chart",
    );
  }
  ticks.sort((a, b) => a.hour - b.hour);

  // Target the rendered tick at the requested hour when one exists, otherwise
  // interpolate/extrapolate from the nearest rendered ticks.
  const exact = ticks.find((t) => t.hour === targetHour);
  let cx;
  let cy;
  if (exact) {
    cx = exact.x;
    cy = exact.y;
  } else {
    const below = [...ticks].reverse().find((t) => t.hour < targetHour);
    const above = ticks.find((t) => t.hour > targetHour);
    const anchor = below ?? above;
    cy = anchor.y;

    if (below && above) {
      cx =
        below.x +
        ((above.x - below.x) * (targetHour - below.hour)) /
          (above.hour - below.hour);
    } else {
      // Only a single flank is available: extrapolate using the average
      // pixels-per-hour spacing between the closest rendered ticks.
      let spacing = null;
      for (let i = 1; i < ticks.length; i++) {
        const s =
          (ticks[i].x - ticks[i - 1].x) / (ticks[i].hour - ticks[i - 1].hour);
        if (spacing === null) spacing = s;
      }
      if (spacing === null) {
        throw new Error(
          "hoverStateMarker: cannot anchor the requested hour from a single tick",
        );
      }
      cx = below
        ? below.x + spacing * (targetHour - below.hour)
        : above.x - spacing * (above.hour - targetHour);
    }
  }

  // Markers start at cumulative value 0, which sits just above the axis tick text.
  cy -= 12;

  for (let dy = -8; dy <= 8; dy += 4) {
    for (let dx = -12; dx <= 12; dx += 4) {
      await page.mouse.move(cx + dx, cy + dy);
      // ECharts renders the tooltip asynchronously after the mousemove, so give
      // it a moment before checking whether it appeared.
      await page.waitForTimeout(60);
      if ((await tooltip.count()) > 0) return;
    }
  }
}
