// @ts-check
import { test, expect } from "@playwright/test";
import {
  setupDataLogMocks,
  waitForDataLogLoad,
  clickColumnMenuItem,
  applyColumnFilter,
} from "../../helpers/data-log-helpers.js";
import { generateDataLogMock } from "../../helpers/mock-generators.js";
import { DATA_LOG_URL } from "../../helpers/constants.js";

// 2001 records with alternating science_program so sort/filter are non-trivial
const LARGE_MOCK = generateDataLogMock(2001, {
  postProcess: (r) => ({
    ...r,
    science_program: r.seq_num % 2 === 0 ? "SURVEY" : "BLOCK",
    airmass: 1.0 + (r.seq_num % 10) * 0.1,
  }),
});

test.describe("Data Log — large dataset (2001 rows)", () => {
  test.beforeEach(async ({ page }) => {
    await setupDataLogMocks(page, { "data-log": LARGE_MOCK });
    await page.goto(DATA_LOG_URL);
    await waitForDataLogLoad(page);
  });

  test("page loads and renders without timeout", async ({ page }) => {
    await expect(page.locator("tbody tr").first()).toBeVisible();
  });

  test("SelectedTimeRangeBar shows total of 2001 exposures", async ({
    page,
  }) => {
    // Exposures beyond the dayobs time range are excluded from the selected count,
    // but the total (denominator) always equals the full dataset size.
    await expect(page.getByText(/of 2001 exposures selected/)).toBeVisible();
  });

  test("sort by exposure_id desc puts highest visible ID first", async ({
    page,
  }) => {
    // Exposure Id is already sorted ascending by default → label shows "Sort by desc."
    // Note: the time range filter limits visible rows to those within the dayobs window
    // (~720 of 2001), so the highest visible ID is not necessarily 20260101002001.
    const firstRowAsc = await page
      .locator("tbody tr")
      .first()
      .locator("td")
      .nth(1)
      .textContent();

    await clickColumnMenuItem(page, "Exposure Id", "Sort by desc.");

    const firstRowDesc = await page
      .locator("tbody tr")
      .first()
      .locator("td")
      .nth(1)
      .textContent();

    // Descending first row should have a higher ID than ascending first row
    expect(Number(firstRowDesc)).toBeGreaterThan(Number(firstRowAsc));
  });

  test("filter by science_program reduces count without crash", async ({
    page,
  }) => {
    await applyColumnFilter(page, "Science Program", ["SURVEY"]);

    // 1001 rows have even seq_num → SURVEY (seq_nums 2,4,...,2000 = 1000, plus none... wait)
    // seq_num % 2 === 0 → SURVEY: 2,4,...,2000 = 1000 rows
    // seq_num % 2 !== 0 → BLOCK: 1,3,...,2001 = 1001 rows
    const count = await page.locator("tbody tr").count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(2001);
  });

  test("group by a column doesn't crash", async ({ page }) => {
    await clickColumnMenuItem(page, "Science Program", "Group by");
    // 2 group headers (SURVEY and BLOCK), both collapsed
    await expect(page.locator("tbody tr")).toHaveCount(2);
  });
});
