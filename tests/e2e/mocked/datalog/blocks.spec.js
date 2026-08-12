// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import { generateDataLogMock } from "../../helpers/mock-generators.js";
import {
  waitForDataLogLoad,
  getDataLogUrl,
  cellByHeader,
} from "../../helpers/datalog-helpers.js";

const DATALOG_URL = getDataLogUrl();

// 10 records: odd seq_nums are BLOCK-320 (present in the lookup),
// even seq_nums are BLOCK-999 (absent from the lookup).
const DATA_LOG = generateDataLogMock(10, {
  postProcess: (r, i) => ({
    ...r,
    science_program: i % 2 === 1 ? "BLOCK-320" : "BLOCK-999",
  }),
});

const BLOCK_URL = "https://rubinobs.atlassian.net/browse/BLOCK-320";
const BLOCK_LOOKUP = {
  data: {
    "BLOCK-320": { url: BLOCK_URL, summary: "Twilight survey" },
  },
  errors: null,
};

test.describe("Data-log page — BLOCK lookup (Zephyr/Jira)", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page, {
      "data-log": DATA_LOG,
      "block-details": BLOCK_LOOKUP,
    });
    await page.goto(DATALOG_URL);
    await waitForDataLogLoad(page);
  });

  test("science program in the lookup renders as a link with the BLOCK url", async ({
    page,
  }) => {
    // Default sort ascending — first row is seq 1 (BLOCK-320)
    const firstRow = page.locator("[data-slot='table-body'] tr").first();
    const link = firstRow.getByRole("link", { name: "BLOCK-320" });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", BLOCK_URL);
  });

  test("BLOCK Description column shows the lookup summary", async ({
    page,
  }) => {
    const firstRow = page.locator("[data-slot='table-body'] tr").first();
    const descCell = await cellByHeader(page, firstRow, "BLOCK Description");
    await expect(descCell).toHaveText("Twilight survey");
  });

  test("science program absent from the lookup renders as plain text with empty description", async ({
    page,
  }) => {
    // Second row is seq 2 (BLOCK-999, not in the lookup)
    const secondRow = page.locator("[data-slot='table-body'] tr").nth(1);
    await expect(secondRow).toContainText("BLOCK-999");
    await expect(
      secondRow.getByRole("link", { name: "BLOCK-999" }),
    ).toHaveCount(0);
    const descCell = await cellByHeader(page, secondRow, "BLOCK Description");
    await expect(descCell).toHaveText("");
  });
});

test.describe("Data-log page — BLOCK lookup partial failure", () => {
  test("one failed source shows its banner; links from the other still work", async ({
    page,
  }) => {
    await setupApiMocks(page, {
      "data-log": DATA_LOG,
      "block-details": { ...BLOCK_LOOKUP, errors: { jira: "boom" } },
    });
    await page.goto(DATALOG_URL);
    await waitForDataLogLoad(page);

    await expect(
      page.getByText("jira-blocks failed to load. Data may be incomplete."),
    ).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/zephyr-blocks/)).toHaveCount(0);

    // Table renders and Zephyr-sourced links are unaffected
    await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(10);
    await expect(
      page.getByRole("link", { name: "BLOCK-320" }).first(),
    ).toHaveAttribute("href", BLOCK_URL);
  });
});
