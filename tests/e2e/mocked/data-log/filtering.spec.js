// @ts-check
import { test, expect } from "@playwright/test";
import {
  setupDataLogMocks,
  waitForDataLogLoad,
  applyColumnFilter,
} from "../../helpers/data-log-helpers.js";
import { generateDataLogMock } from "../../helpers/mock-generators.js";
import { DATA_LOG_URL } from "../../helpers/constants.js";

// ---------------------------------------------------------------------------
// Shared mock setup
//
// 30 records:
//   seq_nums  1-10  → science_program: "SURVEY",      img_type: "SCIENCE"
//   seq_nums 11-20  → science_program: "SURVEY",      img_type: "BIAS"
//   seq_nums 21-30  → science_program: "BLOCK",       img_type: "SCIENCE"
//
// SURVEY has both img_type values so the Obs Type filter UI remains available
// (TanStack only shows the filter UI when faceted unique values > 1).
// ---------------------------------------------------------------------------

function buildFilterMock() {
  return generateDataLogMock(30, {
    postProcess: (r) => {
      const sn = r.seq_num;
      return {
        ...r,
        science_program: sn <= 20 ? "SURVEY" : "BLOCK",
        img_type: sn <= 10 ? "SCIENCE" : sn <= 20 ? "BIAS" : "SCIENCE",
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Single column / single value
// ---------------------------------------------------------------------------

test.describe("Data Log — filtering (single column, single value)", () => {
  test.beforeEach(async ({ page }) => {
    await setupDataLogMocks(page, { "data-log": buildFilterMock() });
    await page.goto(DATA_LOG_URL);
    await waitForDataLogLoad(page);
  });

  test("filter Science Program = SURVEY → 20 rows", async ({ page }) => {
    await applyColumnFilter(page, "Science Program", ["SURVEY"]);
    await expect(page.locator("tbody tr")).toHaveCount(20);
  });

  test("filter Science Program = BLOCK → 10 rows", async ({ page }) => {
    await applyColumnFilter(page, "Science Program", ["BLOCK"]);
    await expect(page.locator("tbody tr")).toHaveCount(10);
  });
});

// ---------------------------------------------------------------------------
// Single column, multiple values
// ---------------------------------------------------------------------------

test.describe("Data Log — filtering (multiple values)", () => {
  test.beforeEach(async ({ page }) => {
    await setupDataLogMocks(page, { "data-log": buildFilterMock() });
    await page.goto(DATA_LOG_URL);
    await waitForDataLogLoad(page);
  });

  test("filter Science Program = SURVEY + BLOCK → 30 rows", async ({
    page,
  }) => {
    await applyColumnFilter(page, "Science Program", ["SURVEY", "BLOCK"]);
    await expect(page.locator("tbody tr")).toHaveCount(30);
  });
});

// ---------------------------------------------------------------------------
// Multi-column filter
// ---------------------------------------------------------------------------

test.describe("Data Log — filtering (multi-column)", () => {
  test.beforeEach(async ({ page }) => {
    await setupDataLogMocks(page, { "data-log": buildFilterMock() });
    await page.goto(DATA_LOG_URL);
    await waitForDataLogLoad(page);
  });

  test("Science Program = SURVEY AND Obs Type = SCIENCE → 10 rows", async ({
    page,
  }) => {
    await applyColumnFilter(page, "Science Program", ["SURVEY"]);
    await expect(page.locator("tbody tr")).toHaveCount(20);
    await applyColumnFilter(page, "Obs Type", ["SCIENCE"]);
    await expect(page.locator("tbody tr")).toHaveCount(10);
  });

  test("Science Program = SURVEY AND Obs Type = BIAS → 10 rows", async ({
    page,
  }) => {
    await applyColumnFilter(page, "Science Program", ["SURVEY"]);
    await applyColumnFilter(page, "Obs Type", ["BIAS"]);
    await expect(page.locator("tbody tr")).toHaveCount(10);
  });
});

// ---------------------------------------------------------------------------
// Filter via URL param
// ---------------------------------------------------------------------------

test.describe("Data Log — filtering (URL params)", () => {
  test.beforeEach(async ({ page }) => {
    await setupDataLogMocks(page, { "data-log": buildFilterMock() });
  });

  test("science_program=SURVEY in URL pre-applies filter on load", async ({
    page,
  }) => {
    await page.goto(DATA_LOG_URL + "&science_program=SURVEY");
    await waitForDataLogLoad(page);
    await expect(page.locator("tbody tr")).toHaveCount(20);
  });

  test("multiple values: science_program=SURVEY&science_program=BLOCK → 30 rows", async ({
    page,
  }) => {
    await page.goto(
      DATA_LOG_URL + "&science_program=SURVEY&science_program=BLOCK",
    );
    await waitForDataLogLoad(page);
    await expect(page.locator("tbody tr")).toHaveCount(30);
  });
});

// ---------------------------------------------------------------------------
// Clearing filters
// ---------------------------------------------------------------------------

test.describe("Data Log — filtering (clearing)", () => {
  test.beforeEach(async ({ page }) => {
    await setupDataLogMocks(page, { "data-log": buildFilterMock() });
    await page.goto(DATA_LOG_URL);
    await waitForDataLogLoad(page);
  });

  test("unchecking all values restores all rows", async ({ page }) => {
    await applyColumnFilter(page, "Science Program", ["SURVEY"]);
    await expect(page.locator("tbody tr")).toHaveCount(20);

    // Reopen and clear
    const th = page
      .locator("th")
      .filter({ hasText: "Science Program" })
      .first();
    await th.locator("button").click({ force: true });
    await expect(page.getByText("Filter:")).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: "Clear" }).click({ force: true });

    await expect(page.locator("tbody tr")).toHaveCount(30);
  });

  test("Reset Table clears all filters", async ({ page }) => {
    await applyColumnFilter(page, "Science Program", ["SURVEY"]);
    await expect(page.locator("tbody tr")).toHaveCount(20);

    await page.getByRole("button", { name: "Reset Table" }).click();
    await expect(page.locator("tbody tr")).toHaveCount(30);
  });
});
