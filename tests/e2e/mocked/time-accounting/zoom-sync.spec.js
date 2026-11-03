// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import {
  twoNightAccountingMocks,
  TWO_NIGHT_ACCOUNTING_URL,
  accountingCard,
} from "../../helpers/time-accounting-fixtures.js";
import { dragOn, getTimeParams } from "../../helpers/plots-helpers.js";
import { waitForTimeAccountingLoad } from "../../helpers/time-accounting-helpers.js";

const plot = (page, mode) =>
  accountingCard(
    page,
    `Observatory Status - ${mode} Night Accumulations`,
  ).getByTestId("obs-status-cumulative-plot");
const labels = (chart) => chart.getByText(/^\d{1,2}:\d{2}$/).allTextContents();
const timeline = (page) => page.locator('[data-slot="obs-status-timeline"]');
const brushRange = (page) =>
  timeline(page).evaluate(
    (element) =>
      element.__echartsInstance?.getModel().getComponent("brush")?.areas?.[0]
        ?.coordRange ?? null,
  );

async function expectSynchronized(page, initial, initialLabels, reset = false) {
  // Retry across range-change navigation.
  await expect(async () => {
    const selected = getTimeParams(page);
    const single = await labels(plot(page, "Single"));
    const multi = await labels(plot(page, "Multi"));
    expect(single.length).toBeGreaterThan(0);
    expect(multi).toEqual(single);
    if (reset) {
      expect(selected).toEqual(initial);
      expect(single).toEqual(initialLabels);
      expect(await brushRange(page)).toBeNull();
    } else {
      expect(selected).not.toEqual(initial);
      expect(Number.isInteger(selected.startTime)).toBe(true);
      expect(Number.isInteger(selected.endTime)).toBe(true);
      expect(selected.endTime).toBeGreaterThan(selected.startTime);
      expect(single).not.toEqual(initialLabels);
      expect(await brushRange(page)).toEqual([
        selected.startTime,
        selected.endTime,
      ]);
    }
  }).toPass({ timeout: 10000 });
}

for (const { mode, shiftKey, reverse } of [
  { mode: "Single", shiftKey: false, reverse: false },
  { mode: "Multi", shiftKey: false, reverse: false },
  { mode: "Multi", shiftKey: true, reverse: true },
]) {
  test(`${mode} ${
    shiftKey ? "reverse Shift" : "rectangle"
  } selection synchronizes plots, timeline and URL; double-click resets all`, async ({
    page,
  }) => {
    await setupApiMocks(page, twoNightAccountingMocks());
    await page.goto(TWO_NIGHT_ACCOUNTING_URL);
    await waitForTimeAccountingLoad(page);
    await expect(
      plot(page, "Single").getByText("Cumulative Hours", { exact: true }),
    ).toBeVisible();
    const initial = getTimeParams(page);
    const initialLabels = await labels(plot(page, "Single"));
    const target = plot(page, mode);
    await dragOn(page, target, {
      fromX: reverse ? 0.68 : 0.28,
      toX: reverse ? 0.28 : 0.68,
      fromY: 0.45,
      toY: 0.65,
      shiftKey,
    });
    await expectSynchronized(page, initial, initialLabels);
    await target.dblclick({ position: { x: 250, y: 120 } });
    await expectSynchronized(page, initial, initialLabels, true);
  });
}

test("timeline selection updates both cumulative axes and a cumulative reset clears the shared zoom", async ({
  page,
}) => {
  await setupApiMocks(page, twoNightAccountingMocks());
  await page.goto(TWO_NIGHT_ACCOUNTING_URL);
  await waitForTimeAccountingLoad(page);
  await expect(
    plot(page, "Single").getByText("Cumulative Hours", { exact: true }),
  ).toBeVisible();
  const initial = getTimeParams(page);
  const initialLabels = await labels(plot(page, "Single"));
  await dragOn(page, timeline(page), {
    fromX: 0.3,
    toX: 0.65,
    fromY: 0.5,
    toY: 0.5,
  });
  await expectSynchronized(page, initial, initialLabels);
  await plot(page, "Multi").dblclick({ position: { x: 250, y: 120 } });
  await expectSynchronized(page, initial, initialLabels, true);
});
