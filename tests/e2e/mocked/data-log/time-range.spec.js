// @ts-check
import { test, expect } from "@playwright/test";
import {
  setupDataLogMocks,
  waitForDataLogLoad,
} from "../../helpers/data-log-helpers.js";
import { generateDataLogMock } from "../../helpers/mock-generators.js";
import { DATA_LOG_URL, FULL_START, FULL_END } from "../../helpers/constants.js";

// ---------------------------------------------------------------------------
// Timing constants
//
// Mock exposures: obs_start (UTC) = 2026-01-02T00:00:00Z + (seq_num - 1) * 60s
// obs_start_millis in the app is converted to TAI (UTC + 37s).
//
// To include only the first 10 exposures, set endTime such that:
//   TAI(exp10) <= endTime < TAI(exp11)
//   TAI(exp10) = 1767312000000 + 9*60000 + 37000 = 1767312577000
//   TAI(exp11) = 1767312000000 + 10*60000 + 37000 = 1767312637000
//   → endTime = 1767312600000  (2026-01-02T00:10:00Z UTC, sits between the two TAI values)
//
// To include 0 exposures, set endTime before TAI(exp1):
//   TAI(exp1) = 1767312000000 + 37000 = 1767312037000
//   → endTime = 1767312000000  (2026-01-02T00:00:00Z UTC)
// ---------------------------------------------------------------------------

const NIGHT_UTC_START = 1767312000000; // 2026-01-02T00:00:00Z
const END_TIME_10_ROWS = NIGHT_UTC_START + 600000; // 2026-01-02T00:10:00Z → keeps first 10 exposures
const END_TIME_0_ROWS = NIGHT_UTC_START; // before any exposure (TAI offset pushes all exposures above this)

test.describe("Data Log — time range (URL params)", () => {
  test.beforeEach(async ({ page }) => {
    await setupDataLogMocks(page, {
      "data-log": generateDataLogMock(30),
    });
  });

  test("full range shows '30 of 30 exposures selected'", async ({ page }) => {
    await page.goto(DATA_LOG_URL);
    await waitForDataLogLoad(page);
    await expect(page.getByText("30 of 30 exposures selected")).toBeVisible();
  });

  test("narrowing endTime via URL reduces row count to 10", async ({
    page,
  }) => {
    await page.goto(
      `${DATA_LOG_URL}&startTime=${FULL_START}&endTime=${END_TIME_10_ROWS}`,
    );
    await waitForDataLogLoad(page);
    await expect(page.locator("tbody tr")).toHaveCount(10);
  });

  test("row count in bar matches table row count", async ({ page }) => {
    await page.goto(
      `${DATA_LOG_URL}&startTime=${FULL_START}&endTime=${END_TIME_10_ROWS}`,
    );
    await waitForDataLogLoad(page);
    await expect(page.getByText("10 of 30 exposures selected")).toBeVisible();
  });

  test("endTime before all exposures shows 0 rows", async ({ page }) => {
    await page.goto(
      `${DATA_LOG_URL}&startTime=${FULL_START}&endTime=${END_TIME_0_ROWS}`,
    );
    await waitForDataLogLoad(page);
    await expect(page.locator("tbody tr")).toHaveCount(0);
    await expect(page.getByText("0 of 30 exposures selected")).toBeVisible();
  });

  test("endTime = FULL_END shows all 30 rows", async ({ page }) => {
    await page.goto(
      `${DATA_LOG_URL}&startTime=${FULL_START}&endTime=${FULL_END}`,
    );
    await waitForDataLogLoad(page);
    await expect(page.locator("tbody tr")).toHaveCount(30);
  });
});

// ---------------------------------------------------------------------------
// Time range bar input editing
// ---------------------------------------------------------------------------

test.describe("Data Log — time range bar input editing", () => {
  test.beforeEach(async ({ page }) => {
    await setupDataLogMocks(page, {
      "data-log": generateDataLogMock(30),
    });
    await page.goto(DATA_LOG_URL);
    await waitForDataLogLoad(page);
  });

  test("editing end time input to narrow range reduces row count", async ({
    page,
  }) => {
    // The end-time input (second text input in the time-range bar) is parsed
    // as UTC: "HH:mm  yyyy-LL-dd" → DateTime in UTC zone.
    //
    // The filter compares obs_start_millis (TAI = UTC+37s) against endMillis (UTC epoch).
    //   exp11 TAI = 1767312000000 + 10*60000 + 37000 = 1767312637000
    //   exp12 TAI = 1767312000000 + 11*60000 + 37000 = 1767312697000
    // "00:11 UTC" = 1767312660000 → exp11 included (637000 ≤ 660000), exp12 excluded → 11 rows.
    const endInput = page.locator("input[type='text']").nth(1);

    await endInput.click({ clickCount: 3 }); // select all
    await endInput.fill("00:11  2026-01-02");
    await endInput.press("Tab"); // trigger onBlur → commit

    await expect(page.locator("tbody tr")).toHaveCount(11);
  });
});
