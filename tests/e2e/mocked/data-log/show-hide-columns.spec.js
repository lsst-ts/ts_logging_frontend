// @ts-check
import { test, expect } from "@playwright/test";
import {
  setupDataLogMocks,
  waitForDataLogLoad,
} from "../../helpers/data-log-helpers.js";
import { DATA_LOG_URL } from "../../helpers/constants.js";

/** Open the Show / Hide Columns popover. */
async function openColumnPopover(page) {
  await page.getByRole("button", { name: "Show / Hide Columns" }).click();
  // Wait for the popover content to appear.
  await page
    .locator('[role="dialog"]')
    .waitFor({ state: "visible", timeout: 5000 });
}

/**
 * Click the checkbox for a named column inside the visibility popover.
 * The popover must already be open.
 */
async function toggleColumnCheckbox(page, columnHeader) {
  const row = page
    .locator("div.flex.items-center")
    .filter({ hasText: columnHeader });
  await row.getByRole("checkbox").click();
}

/** Close the popover by pressing Escape. */
async function closeColumnPopover(page) {
  await page.keyboard.press("Escape");
  await page
    .locator('[role="dialog"]')
    .waitFor({ state: "hidden", timeout: 5000 });
}

// ---------------------------------------------------------------------------
// Show / Hide Columns tests
// ---------------------------------------------------------------------------

test.describe("Data Log — Show / Hide Columns", () => {
  test.beforeEach(async ({ page }) => {
    await setupDataLogMocks(page);
    await page.goto(DATA_LOG_URL);
    await waitForDataLogLoad(page);
  });

  // ---- Popover open / close ----

  test("popover opens on button click", async ({ page }) => {
    await page.getByRole("button", { name: "Show / Hide Columns" }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });

  test("popover closes when clicking outside", async ({ page }) => {
    await page.getByRole("button", { name: "Show / Hide Columns" }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    // Click on the page title — safely outside the popover
    await page.locator("[data-slot='card-title']").click();
    await expect(page.locator('[role="dialog"]')).toBeHidden();
  });

  // ---- Toggle individual columns ----

  test("showing a hidden column adds its header to the table", async ({
    page,
  }) => {
    // "Exposure Name" is hidden by default
    await expect(
      page.locator("th").filter({ hasText: "Exposure Name" }),
    ).toHaveCount(0);

    await openColumnPopover(page);
    await toggleColumnCheckbox(page, "Exposure Name");
    await closeColumnPopover(page);

    await expect(
      page.locator("th").filter({ hasText: "Exposure Name" }).first(),
    ).toBeVisible();
  });

  test("hiding a visible column removes its header", async ({ page }) => {
    // "Airmass" is visible by default
    await expect(
      page.locator("th").filter({ hasText: "Airmass" }).first(),
    ).toBeVisible();

    await openColumnPopover(page);
    await toggleColumnCheckbox(page, "Airmass");
    await closeColumnPopover(page);

    await expect(page.locator("th").filter({ hasText: "Airmass" })).toHaveCount(
      0,
    );
  });

  test("re-checking a column restores it", async ({ page }) => {
    await openColumnPopover(page);
    await toggleColumnCheckbox(page, "Airmass"); // hide
    await closeColumnPopover(page);
    await expect(page.locator("th").filter({ hasText: "Airmass" })).toHaveCount(
      0,
    );

    await openColumnPopover(page);
    await toggleColumnCheckbox(page, "Airmass"); // show again
    await closeColumnPopover(page);
    await expect(
      page.locator("th").filter({ hasText: "Airmass" }).first(),
    ).toBeVisible();
  });

  test('"Hide Column" from column ⋮ menu hides the column', async ({
    page,
  }) => {
    const th = page.locator("th").filter({ hasText: "Airmass" }).first();
    await th.locator("button").click({ force: true });
    const item = page.getByRole("menuitem", { name: "Hide Column" });
    await item.waitFor({ state: "visible", timeout: 5000 });
    await item.click({ force: true });

    await expect(page.locator("th").filter({ hasText: "Airmass" })).toHaveCount(
      0,
    );
  });

  test("Reset Table restores default column visibility", async ({ page }) => {
    // Hide a default-visible column and show a default-hidden column
    await openColumnPopover(page);
    await toggleColumnCheckbox(page, "Airmass"); // hide (was visible)
    await toggleColumnCheckbox(page, "Exposure Name"); // show (was hidden)
    await closeColumnPopover(page);

    await expect(page.locator("th").filter({ hasText: "Airmass" })).toHaveCount(
      0,
    );
    await expect(
      page.locator("th").filter({ hasText: "Exposure Name" }).first(),
    ).toBeVisible();

    await page.getByRole("button", { name: "Reset Table" }).click();

    // Airmass should be back, Exposure Name should be gone
    await expect(
      page.locator("th").filter({ hasText: "Airmass" }).first(),
    ).toBeVisible();
    await expect(
      page.locator("th").filter({ hasText: "Exposure Name" }),
    ).toHaveCount(0);
  });
});
