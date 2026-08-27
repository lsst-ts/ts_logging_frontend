// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../helpers/mock-api.js";
import { generateDataLogMock } from "../helpers/mock-generators.js";
import {
  waitForDataLogLoad,
  getDataLogUrl,
} from "../helpers/datalog-helpers.js";
import { columnHeader } from "../helpers/datatable-helpers.js";

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
