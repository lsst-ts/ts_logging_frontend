// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../helpers/mock-api.js";
import { generateDataLogMock } from "../helpers/mock-generators.js";
import {
  waitForDataLogLoad,
  getDataLogUrl,
} from "../helpers/datalog-helpers.js";
import { columnHeader, cellByHeader } from "../helpers/datatable-helpers.js";

const DATALOG_URL = getDataLogUrl();

test.describe("Scientific Nightly Digest — data log", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page, { "data-log": generateDataLogMock(3) });
    await page.goto(DATALOG_URL);
    await waitForDataLogLoad(page);
  });

  // The internal counterpart is tests/e2e/mocked/datalog/rubintv.spec.js.
  test("the table has no RubinTV column", async ({ page }) => {
    await expect(columnHeader(page, "Exposure Id")).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: /RubinTV/ }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Post-ISR Mosaic" }),
    ).toHaveCount(0);
  });

  test("RubinTV cannot be switched back on", async ({ page }) => {
    await page.getByRole("button", { name: "Show / Hide Columns" }).click();

    const popover = page.locator("[data-slot='popover-content']");
    await expect(popover.getByText("Exposure Id")).toBeVisible();
    await expect(popover.getByText("RubinTV")).toHaveCount(0);
  });
});

// The lookup is still fetched: it fills the BLOCK Description column. Only the
// Science Program links are dropped. The internal counterpart is
// tests/e2e/mocked/components/datatable/block-links.spec.js.
test.describe("Scientific Nightly Digest — BLOCK details", () => {
  const BLOCK_LOOKUP = {
    data: {
      SURVEY: {
        url: "https://rubinobs.atlassian.net/browse/BLOCK-320",
        summary: "Survey block",
      },
    },
    errors: null,
  };

  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page, {
      "data-log": generateDataLogMock(3),
      "block-details": BLOCK_LOOKUP,
    });
    await page.goto(DATALOG_URL);
    await waitForDataLogLoad(page);
  });

  test("science programs render as plain text", async ({ page }) => {
    const row = page.locator("[data-slot='table-body'] tr").first();
    const cell = await cellByHeader(page, row, "Science Program");

    await expect(cell).toContainText("SURVEY");
    await expect(cell.locator("a")).toHaveCount(0);
  });

  test("the BLOCK description is still populated", async ({ page }) => {
    const row = page.locator("[data-slot='table-body'] tr").first();
    const cell = await cellByHeader(page, row, "BLOCK Description");

    await expect(cell).toContainText("Survey block");
  });

  test("the science program tooltip does not mention Zephyr/Jira", async ({
    page,
  }) => {
    await columnHeader(page, "Science Program")
      .locator("span.cursor-help")
      .hover();

    await expect(page.getByText("Science program.")).toBeVisible();
    await expect(page.getByText(/linked to Zephyr\/Jira/)).toHaveCount(0);
  });
});
