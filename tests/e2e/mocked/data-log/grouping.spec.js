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

// ---------------------------------------------------------------------------
// Mock: 30 records, 3 science_programs (10 each), 2 img_types (15 each)
//   seq_nums  1-10 → SURVEY + SCIENCE
//   seq_nums 11-20 → BLOCK  + SCIENCE
//   seq_nums 21-30 → CALIBRATION + BIAS
// ---------------------------------------------------------------------------

function buildGroupingMock() {
  return generateDataLogMock(30, {
    postProcess: (r) => {
      const sn = r.seq_num;
      return {
        ...r,
        science_program:
          sn <= 10 ? "SURVEY" : sn <= 20 ? "BLOCK" : "CALIBRATION",
        img_type: sn <= 15 ? "SCIENCE" : "BIAS",
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Grouping tests
// ---------------------------------------------------------------------------

test.describe("Data Log — grouping", () => {
  test.beforeEach(async ({ page }) => {
    await setupDataLogMocks(page, { "data-log": buildGroupingMock() });
    await page.goto(DATA_LOG_URL);
    await waitForDataLogLoad(page);
  });

  test("group by Science Program → 3 collapsed group headers", async ({
    page,
  }) => {
    await clickColumnMenuItem(page, "Science Program", "Group by");
    // Groups are collapsed by default — only 3 group header rows visible
    await expect(page.locator("tbody tr")).toHaveCount(3);
  });

  test("group header shows correct value and count", async ({ page }) => {
    await clickColumnMenuItem(page, "Science Program", "Group by");
    await expect(page.locator("tbody")).toContainText(
      "Science Program: SURVEY (10)",
    );
  });

  test("expanding a group shows its rows", async ({ page }) => {
    await clickColumnMenuItem(page, "Science Program", "Group by");
    // Click the SURVEY group header to expand it
    await page
      .locator("tbody td")
      .filter({ hasText: "Science Program: SURVEY" })
      .click();
    // 3 group headers + 10 SURVEY leaf rows
    await expect(page.locator("tbody tr")).toHaveCount(13);
  });

  test("collapsing an expanded group hides its rows", async ({ page }) => {
    await clickColumnMenuItem(page, "Science Program", "Group by");
    const surveyHeader = page
      .locator("tbody td")
      .filter({ hasText: "Science Program: SURVEY" });
    await surveyHeader.click(); // expand
    await expect(page.locator("tbody tr")).toHaveCount(13);
    await surveyHeader.click(); // collapse
    await expect(page.locator("tbody tr")).toHaveCount(3);
  });

  test("Expand All Groups / Collapse All Groups button appears when grouped", async ({
    page,
  }) => {
    await clickColumnMenuItem(page, "Science Program", "Group by");
    await expect(
      page.getByRole("button", {
        name: /Expand All Groups|Collapse All Groups/,
      }),
    ).toBeVisible();
  });

  test("Expand All Groups expands all groups", async ({ page }) => {
    await clickColumnMenuItem(page, "Science Program", "Group by");
    await page.getByRole("button", { name: "Expand All Groups" }).click();
    // 3 group headers + 30 leaf rows
    await expect(page.locator("tbody tr")).toHaveCount(33);
  });

  test("Collapse All Groups collapses all groups", async ({ page }) => {
    await clickColumnMenuItem(page, "Science Program", "Group by");
    await page.getByRole("button", { name: "Expand All Groups" }).click();
    await expect(page.locator("tbody tr")).toHaveCount(33);
    await page.getByRole("button", { name: "Collapse All Groups" }).click();
    await expect(page.locator("tbody tr")).toHaveCount(3);
  });

  test("Reset Table removes grouping and restores flat table", async ({
    page,
  }) => {
    await clickColumnMenuItem(page, "Science Program", "Group by");
    await expect(page.locator("tbody tr")).toHaveCount(3);
    await page.getByRole("button", { name: "Reset Table" }).click();
    await expect(page.locator("tbody tr")).toHaveCount(30);
  });

  test("group by column with null values shows NA group", async ({ page }) => {
    await setupDataLogMocks(page, {
      "data-log": generateDataLogMock(5, {
        postProcess: (r) => ({
          ...r,
          science_program: r.seq_num === 3 ? null : "SURVEY",
        }),
      }),
    });
    await page.goto(DATA_LOG_URL);
    await waitForDataLogLoad(page);

    await clickColumnMenuItem(page, "Science Program", "Group by");
    await expect(page.locator("tbody")).toContainText(
      "Science Program: NA (1)",
    );
  });

  test("filter then group — only filtered rows appear in groups", async ({
    page,
  }) => {
    await applyColumnFilter(page, "Science Program", ["SURVEY"]);
    await expect(page.locator("tbody tr")).toHaveCount(10);

    await clickColumnMenuItem(page, "Obs Type", "Group by");
    // SURVEY rows: 10 SCIENCE — so 1 group with 10 rows
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await expect(page.locator("tbody")).toContainText("Obs Type: SCIENCE (10)");
  });
});
