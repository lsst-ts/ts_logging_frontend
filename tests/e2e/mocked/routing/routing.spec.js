// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import { waitForPlotsLoad } from "../../helpers/plots-helpers.js";
import { waitForDataLogLoad } from "../../helpers/data-log-helpers.js";
import {
  PLOTS_URL,
  DATA_LOG_URL,
  FULL_START,
  FULL_END,
  TEST_DAYOBS,
} from "../../helpers/constants.js";

// ---------------------------------------------------------------------------
// Group A — Default parameter application
// ---------------------------------------------------------------------------

test.describe("Routing — default parameters", () => {
  test("navigating to /nightlydigest/plots with no params adds defaults", async ({
    page,
  }) => {
    await setupApiMocks(page);
    await page.goto("/nightlydigest/plots");
    await waitForPlotsLoad(page);

    const params = new URL(page.url()).searchParams;
    expect(params.has("startDayobs")).toBe(true);
    expect(params.has("endDayobs")).toBe(true);
    expect(params.get("telescope")).toBe("Simonyi");
    expect(params.has("startTime")).toBe(true);
    expect(params.has("endTime")).toBe(true);
  });

  test("telescope=AuxTel preserved; dayobs defaults added", async ({
    page,
  }) => {
    await setupApiMocks(page);
    await page.goto(
      `/nightlydigest/plots?startDayobs=${TEST_DAYOBS}&endDayobs=${TEST_DAYOBS}&telescope=AuxTel`,
    );
    // AuxTel is not supported on Plots — wait for the unsupported message instead
    await expect(
      page.getByText("AuxTel is currently not supported in this page"),
    ).toBeVisible({ timeout: 10000 });

    const params = new URL(page.url()).searchParams;
    expect(params.get("telescope")).toBe("AuxTel");
    expect(params.has("startDayobs")).toBe(true);
    expect(params.has("endDayobs")).toBe(true);
  });

  test("startTime and endTime default to dayobs boundaries", async ({
    page,
  }) => {
    await setupApiMocks(page);
    await page.goto(
      `/nightlydigest/plots?startDayobs=${TEST_DAYOBS}&endDayobs=${TEST_DAYOBS}&telescope=Simonyi`,
    );
    await waitForPlotsLoad(page);

    const params = new URL(page.url()).searchParams;
    expect(Number(params.get("startTime"))).toBe(FULL_START);
    expect(Number(params.get("endTime"))).toBe(FULL_END);
  });
});

// ---------------------------------------------------------------------------
// Group B — Validation errors (Plots page)
// ---------------------------------------------------------------------------

test.describe("Routing — validation errors (Plots)", () => {
  const errorHeading = (page) =>
    page.getByRole("heading", { name: "Something went wrong" });

  test("non-numeric dayobs shows error", async ({ page }) => {
    await page.goto(
      "/nightlydigest/plots?startDayobs=notadate&endDayobs=notadate&telescope=Simonyi",
    );
    await expect(errorHeading(page)).toBeVisible({ timeout: 10000 });
    await expect(
      page.locator("li").filter({ hasText: "yyyyMMdd format" }).first(),
    ).toBeVisible();
  });

  test("7-digit dayobs shows error", async ({ page }) => {
    await page.goto(
      "/nightlydigest/plots?startDayobs=2026010&endDayobs=2026010&telescope=Simonyi",
    );
    await expect(errorHeading(page)).toBeVisible({ timeout: 10000 });
    await expect(
      page.locator("li").filter({ hasText: "yyyyMMdd format" }).first(),
    ).toBeVisible();
  });

  test("invalid calendar date (day 32) shows error", async ({ page }) => {
    await page.goto(
      "/nightlydigest/plots?startDayobs=20260132&endDayobs=20260132&telescope=Simonyi",
    );
    await expect(errorHeading(page)).toBeVisible({ timeout: 10000 });
    await expect(
      page
        .locator("li")
        .filter({ hasText: "Not a valid calendar date" })
        .first(),
    ).toBeVisible();
  });

  test("invalid calendar date (month 13) shows error", async ({ page }) => {
    await page.goto(
      "/nightlydigest/plots?startDayobs=20261301&endDayobs=20261301&telescope=Simonyi",
    );
    await expect(errorHeading(page)).toBeVisible({ timeout: 10000 });
    await expect(
      page
        .locator("li")
        .filter({ hasText: "Not a valid calendar date" })
        .first(),
    ).toBeVisible();
  });

  test("startDayobs after endDayobs shows error", async ({ page }) => {
    await page.goto(
      "/nightlydigest/plots?startDayobs=20260201&endDayobs=20260101&telescope=Simonyi",
    );
    await expect(errorHeading(page)).toBeVisible({ timeout: 10000 });
    await expect(
      page.locator("li").filter({
        hasText: "startDayobs must be before or equal to endDayobs",
      }),
    ).toBeVisible();
  });

  test("future date shows error", async ({ page }) => {
    await page.goto(
      "/nightlydigest/plots?startDayobs=20991231&endDayobs=20991231&telescope=Simonyi",
    );
    await expect(errorHeading(page)).toBeVisible({ timeout: 10000 });
    await expect(
      page.locator("li").filter({ hasText: "date in the future" }).first(),
    ).toBeVisible();
  });

  test("invalid telescope enum shows error", async ({ page }) => {
    await page.goto(
      `/nightlydigest/plots?startDayobs=${TEST_DAYOBS}&endDayobs=${TEST_DAYOBS}&telescope=Keck`,
    );
    await expect(errorHeading(page)).toBeVisible({ timeout: 10000 });
  });
});

// ---------------------------------------------------------------------------
// Group C — applyCommonValidations transforms
// ---------------------------------------------------------------------------

test.describe("Routing — time param transforms (Plots)", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });

  test("inverted startTime/endTime are swapped", async ({ page }) => {
    await page.goto(`${PLOTS_URL}&startTime=${FULL_END}&endTime=${FULL_START}`);
    await waitForPlotsLoad(page);

    const params = new URL(page.url()).searchParams;
    expect(Number(params.get("startTime"))).toBe(FULL_START);
    expect(Number(params.get("endTime"))).toBe(FULL_END);
  });

  test("startTime before dayobs start is clamped to FULL_START", async ({
    page,
  }) => {
    await page.goto(
      `${PLOTS_URL}&startTime=${FULL_START - 3_600_000}&endTime=${FULL_END}`,
    );
    await waitForPlotsLoad(page);

    const params = new URL(page.url()).searchParams;
    expect(Number(params.get("startTime"))).toBe(FULL_START);
  });

  test("endTime after dayobs end is clamped to FULL_END", async ({ page }) => {
    await page.goto(
      `${PLOTS_URL}&startTime=${FULL_START}&endTime=${FULL_END + 3_600_000}`,
    );
    await waitForPlotsLoad(page);

    const params = new URL(page.url()).searchParams;
    expect(Number(params.get("endTime"))).toBe(FULL_END);
  });

  test("startTime and endTime exactly on boundaries are not clamped", async ({
    page,
  }) => {
    await page.goto(`${PLOTS_URL}&startTime=${FULL_START}&endTime=${FULL_END}`);
    await waitForPlotsLoad(page);

    const params = new URL(page.url()).searchParams;
    expect(Number(params.get("startTime"))).toBe(FULL_START);
    expect(Number(params.get("endTime"))).toBe(FULL_END);
  });

  test("startTime = endTime (single point) is preserved", async ({ page }) => {
    const mid = FULL_START + 6 * 3_600_000;
    await page.goto(`${PLOTS_URL}&startTime=${mid}&endTime=${mid}`);
    await waitForPlotsLoad(page);

    const params = new URL(page.url()).searchParams;
    expect(Number(params.get("startTime"))).toBe(mid);
    expect(Number(params.get("endTime"))).toBe(mid);
  });
});

// ---------------------------------------------------------------------------
// Group D — Unknown param stripping
// ---------------------------------------------------------------------------

test.describe("Routing — unknown param stripping", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });

  test("unknown param stripped from plots", async ({ page }) => {
    await page.goto(`${PLOTS_URL}&unknownParam=foo`);
    await waitForPlotsLoad(page);
    expect(new URL(page.url()).searchParams.has("unknownParam")).toBe(false);
  });

  test("multiple unknown params stripped from plots", async ({ page }) => {
    await page.goto(`${PLOTS_URL}&a=1&b=2`);
    await waitForPlotsLoad(page);
    const params = new URL(page.url()).searchParams;
    expect(params.has("a")).toBe(false);
    expect(params.has("b")).toBe(false);
  });

  test("data-log filter param stripped from plots", async ({ page }) => {
    await page.goto(`${PLOTS_URL}&science_program=SURVEY`);
    await waitForPlotsLoad(page);
    expect(new URL(page.url()).searchParams.has("science_program")).toBe(false);
  });

  test("unknown param stripped from data-log", async ({ page }) => {
    await page.goto(`${DATA_LOG_URL}&unknownParam=foo`);
    await waitForDataLogLoad(page);
    expect(new URL(page.url()).searchParams.has("unknownParam")).toBe(false);
  });

  test("data-log filter param accepted on data-log page", async ({ page }) => {
    await page.goto(`${DATA_LOG_URL}&science_program=SURVEY`);
    await waitForDataLogLoad(page);
    expect(new URL(page.url()).searchParams.get("science_program")).toBe(
      "SURVEY",
    );
  });

  test("data-log filter param stripped from plots page", async ({ page }) => {
    await page.goto(`${PLOTS_URL}&science_program=SURVEY`);
    await waitForPlotsLoad(page);
    expect(new URL(page.url()).searchParams.has("science_program")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Group E — Filter params pre-apply on DataLog table
// ---------------------------------------------------------------------------

const FILTER_MOCK = (() => {
  const makeRows = (count, offset, science_program, hourPrefix) =>
    [...Array(count)].map((_, i) => ({
      exposure_id: 20260101000001 + offset + i,
      exposure_name: `MC_O_20260101_${String(offset + i + 1).padStart(6, "0")}`,
      seq_num: offset + i + 1,
      day_obs: 20260101,
      science_program,
      img_type: "SCIENCE",
      obs_start: `2026-01-02T${hourPrefix}:${String(i).padStart(2, "0")}:00`,
      obs_end: `2026-01-02T${hourPrefix}:${String(i).padStart(2, "0")}:30`,
      band: "y",
      physical_filter: "y_10",
      airmass: 1.3,
      exp_time: 30,
      can_see_sky: true,
    }));

  return {
    data_log: [
      ...makeRows(10, 0, "SURVEY", "00"),
      ...makeRows(10, 10, "BLOCK", "01"),
      ...makeRows(10, 20, "CALIBRATION", "02"),
    ],
  };
})();

test.describe("Routing — filter params pre-apply on DataLog", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page, { "data-log": FILTER_MOCK });
  });

  test("single filter value pre-applies (10 rows)", async ({ page }) => {
    await page.goto(`${DATA_LOG_URL}&science_program=SURVEY`);
    await waitForDataLogLoad(page);
    await expect(page.locator("tbody tr")).toHaveCount(10);
  });

  test("multiple values for same param shows combined rows (20 rows)", async ({
    page,
  }) => {
    await page.goto(
      `${DATA_LOG_URL}&science_program=SURVEY&science_program=BLOCK`,
    );
    await waitForDataLogLoad(page);
    await expect(page.locator("tbody tr")).toHaveCount(20);
  });

  test("filter param survives page reload", async ({ page }) => {
    await page.goto(`${DATA_LOG_URL}&science_program=SURVEY`);
    await waitForDataLogLoad(page);
    await page.reload();
    await waitForDataLogLoad(page);
    await expect(page.locator("tbody tr")).toHaveCount(10);
  });
});

// ---------------------------------------------------------------------------
// Group F — Validation errors on DataLog page
// ---------------------------------------------------------------------------

test.describe("Routing — validation errors (DataLog)", () => {
  const errorHeading = (page) =>
    page.getByRole("heading", { name: "Something went wrong" });

  test("invalid dayobs on data-log shows error", async ({ page }) => {
    await page.goto(
      "/nightlydigest/data-log?startDayobs=bad&endDayobs=bad&telescope=Simonyi",
    );
    await expect(errorHeading(page)).toBeVisible({ timeout: 10000 });
  });

  test("startDayobs > endDayobs on data-log shows error", async ({ page }) => {
    await page.goto(
      "/nightlydigest/data-log?startDayobs=20260201&endDayobs=20260101&telescope=Simonyi",
    );
    await expect(errorHeading(page)).toBeVisible({ timeout: 10000 });
    await expect(
      page.locator("li").filter({
        hasText: "startDayobs must be before or equal to endDayobs",
      }),
    ).toBeVisible();
  });

  test("invalid telescope on data-log shows error", async ({ page }) => {
    await page.goto(
      `/nightlydigest/data-log?startDayobs=${TEST_DAYOBS}&endDayobs=${TEST_DAYOBS}&telescope=Keck`,
    );
    await expect(errorHeading(page)).toBeVisible({ timeout: 10000 });
  });
});
