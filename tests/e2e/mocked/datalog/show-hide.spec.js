// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import {
  waitForDataLogLoad,
  openColumnMenu,
  getDataLogUrl,
} from "../../helpers/datalog-helpers.js";

const DATALOG_URL = getDataLogUrl();

/**
 * Clicks the checkbox next to a column name in the Show/Hide Columns popover.
 * Shadcn Checkbox has no label association, so we find the parent div by text.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} columnName
 */
async function toggleColumnVisibility(page, columnName) {
  const row = page
    .locator("div.flex.items-center")
    .filter({ hasText: columnName });
  await row.locator("[data-slot='checkbox']").click();
}

test.describe("Data-log page — show/hide columns", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await page.goto(DATALOG_URL);
    await waitForDataLogLoad(page);
  });

  test("Show / Hide Columns button opens popover with column list", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Show / Hide Columns" }).click();
    await expect(
      page.getByRole("button", { name: "Select All", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Deselect All" }),
    ).toBeVisible();
    // Spot-check a visible column and a hidden-by-default column appear in list
    // Scope to popover content to avoid matching table column headers
    const popover = page.locator("[data-slot='popover-content']");
    await expect(popover.getByText("Airmass")).toBeVisible();
    await expect(popover.getByText("Seq Num")).toBeVisible();
  });

  test("hiding a visible column removes it from the table header", async ({
    page,
  }) => {
    await expect(
      page.getByRole("columnheader", { name: /^Airmass/ }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Show / Hide Columns" }).click();
    await toggleColumnVisibility(page, "Airmass");

    await expect(
      page.getByRole("columnheader", { name: /^Airmass/ }),
    ).toHaveCount(0);
  });

  test("showing a hidden-by-default column adds it to the table header", async ({
    page,
  }) => {
    // Seq Num is hidden by default for Simonyi
    await expect(
      page.getByRole("columnheader", { name: /^Seq Num/ }),
    ).toHaveCount(0);

    await page.getByRole("button", { name: "Show / Hide Columns" }).click();
    await toggleColumnVisibility(page, "Seq Num");

    await expect(
      page.getByRole("columnheader", { name: /^Seq Num/ }),
    ).toBeVisible();
  });

  test("Hide Column via column menu hides that column", async ({ page }) => {
    await expect(
      page.getByRole("columnheader", { name: /^Airmass/ }),
    ).toBeVisible();

    await openColumnMenu(page, "Airmass");
    await page.getByRole("menuitem", { name: "Hide Column" }).click();

    await expect(
      page.getByRole("columnheader", { name: /^Airmass/ }),
    ).toHaveCount(0);
  });

  test("Deselect All hides all columns", async ({ page }) => {
    await page.getByRole("button", { name: "Show / Hide Columns" }).click();
    await page.getByRole("button", { name: "Deselect All" }).click();

    await expect(page.locator("[data-slot='table'] th")).toHaveCount(0);
  });

  test("Select All shows all columns", async ({ page }) => {
    // First hide one to establish a baseline change
    await page.getByRole("button", { name: "Show / Hide Columns" }).click();
    await toggleColumnVisibility(page, "Airmass");
    await expect(
      page.getByRole("columnheader", { name: /^Airmass/ }),
    ).toHaveCount(0);

    await page.getByRole("button", { name: "Select All", exact: true }).click();
    await expect(
      page.getByRole("columnheader", { name: /^Airmass/ }),
    ).toBeVisible();
  });

  test("Reset Table restores default column visibility", async ({ page }) => {
    // Hide a default-visible column and show a default-hidden one
    await page.getByRole("button", { name: "Show / Hide Columns" }).click();
    await toggleColumnVisibility(page, "Airmass"); // hide
    await toggleColumnVisibility(page, "Seq Num"); // show
    await page.keyboard.press("Escape");

    await expect(
      page.getByRole("columnheader", { name: /^Airmass/ }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("columnheader", { name: /^Seq Num/ }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Reset Table" }).click();

    await expect(
      page.getByRole("columnheader", { name: /^Airmass/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: /^Seq Num/ }),
    ).toHaveCount(0);
  });
});
