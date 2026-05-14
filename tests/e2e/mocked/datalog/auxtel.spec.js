// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import {
  waitForDataLogLoad,
  getDataLogUrl,
} from "../../helpers/datalog-helpers.js";

const AUXTEL_URL = getDataLogUrl("20260101", "AuxTel");

// Simonyi-specific columns that should not exist for AuxTel at all
const SIMONYI_ONLY_HEADERS = [
  "Filter",
  "Median PSF",
  "Sky Brightness",
  "Photometric ZP",
];

test.describe("Data-log page — AuxTel", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await page.goto(AUXTEL_URL);
    await waitForDataLogLoad(page);
  });

  test("AuxTel page loads with 30 rows and no error toasts", async ({
    page,
  }) => {
    const errors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(30);
    await expect(page.getByText(/Error fetching/)).toHaveCount(0);
  });

  test("exposure_name column is visible by default; exposure_id is hidden", async ({
    page,
  }) => {
    await expect(
      page.getByRole("columnheader", { name: /^Exposure Name/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: /^Exposure Id/ }),
    ).toHaveCount(0);
  });

  test("Simonyi-only columns are absent from the table header", async ({
    page,
  }) => {
    for (const header of SIMONYI_ONLY_HEADERS) {
      await expect(
        page.getByRole("columnheader", { name: new RegExp(`^${header}`) }),
      ).toHaveCount(0);
    }
  });

  test("Simonyi-only columns are absent from Show / Hide Columns popover", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Show / Hide Columns" }).click();
    const popover = page.locator("[data-slot='popover-content']");
    for (const header of SIMONYI_ONLY_HEADERS) {
      await expect(popover.getByText(header, { exact: true })).toHaveCount(0);
    }
  });

  test("Outside Air Temp column is hidden by default on AuxTel", async ({
    page,
  }) => {
    await expect(
      page.getByRole("columnheader", { name: /^Outside Air Temp/ }),
    ).toHaveCount(0);
  });

  test("Reset Table works on AuxTel and restores default visibility", async ({
    page,
  }) => {
    // Show a hidden-by-default column
    await page.getByRole("button", { name: "Show / Hide Columns" }).click();
    const popover = page.locator("[data-slot='popover-content']");
    const seqNumRow = popover
      .locator("div.flex.items-center")
      .filter({ hasText: "Seq Num" });
    await seqNumRow.locator("[data-slot='checkbox']").click();
    await page.keyboard.press("Escape");

    await expect(
      page.getByRole("columnheader", { name: /^Seq Num/ }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Reset Table" }).click();

    await expect(
      page.getByRole("columnheader", { name: /^Seq Num/ }),
    ).toHaveCount(0);
  });
});
