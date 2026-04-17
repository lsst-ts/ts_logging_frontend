// @ts-check
import { expect } from "@playwright/test";

/**
 * Waits for the Plots page to finish loading.
 * The "Show / Hide Plots" button is only rendered once both dataLogLoading
 * and almanacLoading are false, making it a reliable load sentinel.
 *
 * @param {import('@playwright/test').Page} page
 */
export async function waitForPlotsLoad(page) {
  await expect(
    page.getByRole("button", { name: "Show / Hide Plots" }),
  ).toBeVisible({ timeout: 15000 });
}

/**
 * Simulates a mouse drag on a locator element using page.mouse.
 *
 * fromX/toX/fromY/toY are fractions [0,1] of the element's bounding box.
 * Modifier keys are held for the entire gesture.
 * The mouse moves in 10 steps so that Recharts receives plenty of mousemove
 * events and correctly computes chart-relative coordinates.
 *
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} locator
 * @param {{ fromX: number, toX: number, fromY: number, toY: number, shiftKey?: boolean, ctrlKey?: boolean }} options
 */
export async function dragOn(
  page,
  locator,
  { fromX, toX, fromY, toY, shiftKey = false, ctrlKey = false },
) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  const sx = box.x + box.width * fromX;
  const sy = box.y + box.height * fromY;
  const ex = box.x + box.width * toX;
  const ey = box.y + box.height * toY;

  if (shiftKey) await page.keyboard.down("Shift");
  if (ctrlKey) await page.keyboard.down("Control");

  await page.mouse.move(sx, sy);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) {
    const t = i / 10;
    await page.mouse.move(sx + (ex - sx) * t, sy + (ey - sy) * t);
  }
  await page.mouse.up();

  if (shiftKey) await page.keyboard.up("Shift");
  if (ctrlKey) await page.keyboard.up("Control");
}

/**
 * Returns { startTime, endTime } from the current page URL.
 * Values are numbers, or null if the param is absent.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {{ startTime: number | null, endTime: number | null }}
 */
export function getTimeParams(page) {
  const params = new URL(page.url()).searchParams;
  return {
    startTime: params.has("startTime") ? Number(params.get("startTime")) : null,
    endTime: params.has("endTime") ? Number(params.get("endTime")) : null,
  };
}

/**
 * Scrolls the nth dot (0-based) in the given chart into the viewport then
 * moves the mouse to its centre. Uses page.mouse.move() to bypass
 * Playwright's actionability checks on overlapping SVG elements.
 *
 * For reliable hover targeting, use spread-out mock data so dots don't
 * overlap (e.g. postProcess: (r) => ({ ...r, airmass: 1.0 + r.seq_num * 0.2 })).
 *
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} chartLocator
 * @param {number} [dotIndex=0]
 */
export async function hoverDot(page, chartLocator, dotIndex = 0) {
  const dot = chartLocator.locator("[data-obsid]").nth(dotIndex);
  await dot.scrollIntoViewIfNeeded();
  const box = await dot.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
}
