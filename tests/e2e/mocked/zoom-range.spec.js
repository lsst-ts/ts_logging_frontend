// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../helpers/mock-api.js";
import { generateDataLogMock } from "../helpers/mock-generators.js";

const TEST_DAYOBS = "20260101";
const TEST_DAYOBS_INT = 20260101;
const PLOTS_URL = `/nightlydigest/plots?startDayobs=${TEST_DAYOBS}&endDayobs=${TEST_DAYOBS}&telescope=Simonyi`;

// Full time range UTC boundaries for dayobs=20260101:
//   getDayobsStartUTC("20260101") = 2026-01-01T12:00:00Z = 1767268800000 ms
//   getDayobsEndUTC("20260101")   = 2026-01-02T11:59:59Z = 1767355199000 ms
const FULL_START = 1767268800000;
const FULL_END = 1767355199000;
const FULL_RANGE = FULL_END - FULL_START;

// Mock record TAI timestamps.
// obs_start for record N (1-indexed) is UTC midnight of 2026-01-02 + (N-1) minutes.
// nightStart = 2026-01-02T00:00:00Z = 1767312000000 ms
// obs_start_dt (TAI) = obs_start (UTC) + 37000 ms
function recTAI(n) {
  return 1767312000000 + (n - 1) * 60000 + 37000;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Waits for the Plots page to finish loading data. */
async function waitForPlotsLoad(page) {
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
 */
async function dragOn(
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
 */
function getTimeParams(page) {
  const params = new URL(page.url()).searchParams;
  return {
    startTime: params.has("startTime") ? Number(params.get("startTime")) : null,
    endTime: params.has("endTime") ? Number(params.get("endTime")) : null,
  };
}

// ---------------------------------------------------------------------------
// Shared mock data (spread-out airmass values so dots are well-separated)
// ---------------------------------------------------------------------------
const ZOOM_MOCK_DATA = generateDataLogMock(10, {
  dayobs: TEST_DAYOBS_INT,
  postProcess: (r) => ({ ...r, airmass: 1.0 + r.seq_num * 0.15 }),
});

// ---------------------------------------------------------------------------

test.describe("Timeline — drag range selection", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page, { "data-log": ZOOM_MOCK_DATA });
    await page.goto(PLOTS_URL);
    await waitForPlotsLoad(page);
  });

  test("drag on timeline adds startTime and endTime to URL", async ({
    page,
  }) => {
    // Drag across the middle third of the timeline (horizontal only — the
    // TimelineChart uses 1D selection so only X needs to change).
    // The timeline SVG is the recharts-surface that is NOT inside any
    // [data-slot="chart"] container (those belong to the individual plots).
    const timelineSvg = page.locator(
      ':not([data-slot="chart"]) > .recharts-responsive-container svg.recharts-surface',
    );
    await expect(timelineSvg).toBeVisible();

    await dragOn(page, timelineSvg, {
      fromX: 0.25,
      toX: 0.75,
      fromY: 0.5,
      toY: 0.5,
    });

    await expect(page).toHaveURL(/startTime=/);
    const { startTime, endTime } = getTimeParams(page);

    // Both params must be present and form a valid sub-range
    expect(startTime).not.toBeNull();
    expect(endTime).not.toBeNull();
    expect(startTime).toBeLessThan(endTime);
    expect(startTime).toBeGreaterThanOrEqual(FULL_START);
    expect(endTime).toBeLessThanOrEqual(FULL_END);
    // The drag covered the middle third so the result must be narrower
    // than the full range
    expect(endTime - startTime).toBeLessThan(FULL_RANGE);
  });
});

// ---------------------------------------------------------------------------

test.describe("Timeline — double-click resets selection", () => {
  test.beforeEach(async ({ page }) => {
    // Start with a pre-existing selection so there is something to reset
    await setupApiMocks(page, { "data-log": ZOOM_MOCK_DATA });
    await page.goto(`${PLOTS_URL}&startTime=${recTAI(2)}&endTime=${recTAI(8)}`);
    await waitForPlotsLoad(page);
  });

  test("double-click on timeline resets to the full time range", async ({
    page,
  }) => {
    const timelineSvg = page.locator(
      ':not([data-slot="chart"]) > .recharts-responsive-container svg.recharts-surface',
    );
    await expect(timelineSvg).toBeVisible();

    await timelineSvg.dblclick();

    // The reset callback sets selectedTimeRange = fullTimeRange which
    // navigates to startTime=FULL_START, endTime=FULL_END
    await expect.poll(() => getTimeParams(page).startTime).toBe(FULL_START);
    await expect.poll(() => getTimeParams(page).endTime).toBe(FULL_END);
  });
});

// ---------------------------------------------------------------------------

test.describe("Timeline — shift-extend selection", () => {
  // Pre-set a selection at roughly 30 %–60 % of the full time range
  const INIT_START = FULL_START + Math.round(0.3 * FULL_RANGE); // ≈ 1767294720000
  const INIT_END = FULL_START + Math.round(0.6 * FULL_RANGE); //   ≈ 1767320640000

  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page, { "data-log": ZOOM_MOCK_DATA });
    await page.goto(`${PLOTS_URL}&startTime=${INIT_START}&endTime=${INIT_END}`);
    await waitForPlotsLoad(page);
  });

  test("shift-drag from outside the selection extends it from the farther edge", async ({
    page,
  }) => {
    const timelineSvg = page.locator(
      ':not([data-slot="chart"]) > .recharts-responsive-container svg.recharts-surface',
    );
    await expect(timelineSvg).toBeVisible();

    // The existing selection is at 30 %–60 %.  Clicking at ~80 % is closer
    // to the right/60 % edge (distance 20 %) than to the left/30 % edge
    // (distance 50 %), so the shift-extend code anchors to the LEFT edge
    // (the farther one) and extends to the new mouse-up position (~90 %).
    await dragOn(page, timelineSvg, {
      fromX: 0.8,
      toX: 0.9,
      fromY: 0.5,
      toY: 0.5,
      shiftKey: true,
    });

    await expect
      .poll(() => getTimeParams(page).endTime)
      .toBeGreaterThan(INIT_END);

    // The left anchor should be preserved.  Allow a small tolerance because
    // the pixel↔time round-trip has ~pixel-width precision (~1–2 min on a
    // 24-hour timeline).
    const { startTime } = getTimeParams(page);
    const TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes
    expect(startTime).toBeGreaterThanOrEqual(INIT_START - TOLERANCE_MS);
    expect(startTime).toBeLessThanOrEqual(INIT_START + TOLERANCE_MS);
  });
});

// ---------------------------------------------------------------------------

test.describe("Individual plots — drag zoom in (X and Y)", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page, { "data-log": ZOOM_MOCK_DATA });
    await page.goto(PLOTS_URL);
    await waitForPlotsLoad(page);
    await expect(
      page
        .locator("[data-slot='chart']")
        .first()
        .locator("[data-obsid]")
        .first(),
    ).toBeAttached();
  });

  test("drag on a plot zooms the X axis and updates URL", async ({ page }) => {
    // The TimeseriesPlot uses 2D selection (enable2DSelection=true), so both
    // fractionX and fractionY must change for the callback to fire.  A
    // diagonal drag achieves this without requiring spread-out Y data.
    const firstChartSvg = page
      .locator("[data-slot='chart']")
      .first()
      .locator("svg.recharts-surface");

    await dragOn(page, firstChartSvg, {
      fromX: 0.2,
      toX: 0.8,
      fromY: 0.25,
      toY: 0.75,
    });

    await expect(page).toHaveURL(/startTime=/);
    const { startTime, endTime } = getTimeParams(page);
    expect(startTime).not.toBeNull();
    expect(endTime).not.toBeNull();
    expect(startTime).toBeLessThan(endTime);
    expect(endTime - startTime).toBeLessThan(FULL_RANGE);
  });

  test("drag without Shift also zooms the Y axis (reset button appears)", async ({
    page,
  }) => {
    const firstChart = page.locator("[data-slot='chart']").first();
    const resetButton = firstChart.locator('[aria-label="Reset Y-axis zoom"]');
    await expect(resetButton).not.toBeVisible();

    const firstChartSvg = firstChart.locator("svg.recharts-surface");

    await dragOn(page, firstChartSvg, {
      fromX: 0.2,
      toX: 0.8,
      fromY: 0.25,
      toY: 0.75,
    });

    // Without the Shift key, the Y fraction also updates → reset button
    await expect(resetButton).toBeVisible();
  });
});

// ---------------------------------------------------------------------------

test.describe("Individual plots — shift drag (X only, Y unchanged)", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page, { "data-log": ZOOM_MOCK_DATA });
    await page.goto(PLOTS_URL);
    await waitForPlotsLoad(page);
    await expect(
      page
        .locator("[data-slot='chart']")
        .first()
        .locator("[data-obsid]")
        .first(),
    ).toBeAttached();
  });

  test("shift-drag zooms X but leaves Y unchanged (no reset button)", async ({
    page,
  }) => {
    const firstChart = page.locator("[data-slot='chart']").first();
    const resetButton = firstChart.locator('[aria-label="Reset Y-axis zoom"]');
    await expect(resetButton).not.toBeVisible();

    const firstChartSvg = firstChart.locator("svg.recharts-surface");

    await dragOn(page, firstChartSvg, {
      fromX: 0.2,
      toX: 0.8,
      fromY: 0.25,
      toY: 0.75,
      shiftKey: true,
    });

    // X should have been zoomed (URL updated)
    await expect(page).toHaveURL(/startTime=/);

    // Y must NOT have been zoomed — the reset button must remain absent
    await expect(resetButton).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------

test.describe("Individual plots — ctrl drag zoom out", () => {
  // Start with a tight zoom covering only the first 5 records (4 minutes)
  const ZOOMED_START = recTAI(1); // 1767312037000
  const ZOOMED_END = recTAI(5); //   1767312277000
  const ZOOMED_RANGE = ZOOMED_END - ZOOMED_START; // 240 000 ms

  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page, { "data-log": ZOOM_MOCK_DATA });
    await page.goto(
      `${PLOTS_URL}&startTime=${ZOOMED_START}&endTime=${ZOOMED_END}`,
    );
    await waitForPlotsLoad(page);
    await expect(
      page
        .locator("[data-slot='chart']")
        .first()
        .locator("[data-obsid]")
        .first(),
    ).toBeAttached();
  });

  test("ctrl-drag expands the visible time range (zoom out)", async ({
    page,
  }) => {
    const firstChartSvg = page
      .locator("[data-slot='chart']")
      .first()
      .locator("svg.recharts-surface");

    await dragOn(page, firstChartSvg, {
      fromX: 0.2,
      toX: 0.8,
      fromY: 0.25,
      toY: 0.75,
      ctrlKey: true,
    });

    // Wait for the URL to reflect a wider range
    await expect
      .poll(
        () => {
          const { startTime, endTime } = getTimeParams(page);
          return endTime !== null && startTime !== null
            ? endTime - startTime
            : 0;
        },
        { timeout: 5000 },
      )
      .toBeGreaterThan(ZOOMED_RANGE);

    const { startTime, endTime } = getTimeParams(page);
    // Zoom-out must not exceed the full time range
    expect(startTime).toBeGreaterThanOrEqual(FULL_START);
    expect(endTime).toBeLessThanOrEqual(FULL_END);
  });
});

// ---------------------------------------------------------------------------

test.describe("Zoom — filtered data display", () => {
  test("navigating with startTime/endTime shows only observations within that range", async ({
    page,
  }) => {
    // Generate 10 records; set a URL that covers only records 1–5.
    //
    // The chart filter compares obs_start_dt (TAI DateTime, valueOf()=TAI ms)
    // against selectedMinMillis/selectedMaxMillis (URL values).
    // Setting endTime = recTAI(5) means:
    //   • record 5: TAI = recTAI(5) ≤ endTime  → included
    //   • record 6: TAI = recTAI(6) > endTime  → excluded
    const mockData = generateDataLogMock(10, { dayobs: TEST_DAYOBS_INT });
    await setupApiMocks(page, { "data-log": mockData });

    await page.goto(
      `${PLOTS_URL}&startTime=${FULL_START}&endTime=${recTAI(5)}`,
    );
    await waitForPlotsLoad(page);

    // The first chart (Airmass) should render exactly 5 dots
    const firstChart = page.locator("[data-slot='chart']").first();
    await expect(firstChart.locator("[data-obsid]").first()).toBeAttached();
    await expect(firstChart.locator("[data-obsid]")).toHaveCount(5);
  });
});
