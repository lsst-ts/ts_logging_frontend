// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import { generateDataLogMock } from "../../helpers/mock-generators.js";
import { waitForPlotsLoad } from "../../helpers/plots-helpers.js";
import { PLOTS_URL, TEST_DAYOBS_INT } from "../../helpers/constants.js";

// ---------------------------------------------------------------------------

test.describe("Show / Hide Plots — open and close", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await page.goto(PLOTS_URL);
    await waitForPlotsLoad(page);
  });

  test("opens when the button is clicked", async ({ page }) => {
    await page.getByRole("button", { name: "Show / Hide Plots" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test.describe("closing", () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole("button", { name: "Show / Hide Plots" }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
    });

    test("closes via Escape", async ({ page }) => {
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).not.toBeVisible();
    });

    test("closes via the close button", async ({ page }) => {
      await page.locator("[data-slot='dialog-close']").click();
      await expect(page.getByRole("dialog")).not.toBeVisible();
    });

    test("closes by clicking outside", async ({ page }) => {
      // Click at top-left corner (outside the dialog content) to trigger
      // Radix's DismissableLayer pointer-outside detection.
      await page.mouse.click(10, 10);
      await expect(page.getByRole("dialog")).not.toBeVisible();
    });
  });
});

// ---------------------------------------------------------------------------

test.describe("Show / Hide Plots — adding and removing plots", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await page.goto(PLOTS_URL);
    await waitForPlotsLoad(page);
  });

  test("checking a plot adds it to the page", async ({ page }) => {
    await expect(page.locator("[data-slot='chart']")).toHaveCount(4);
    await page.getByRole("button", { name: "Show / Hide Plots" }).click();
    await page.locator("label[for='plot-selected-exp_time']").click();
    await page.keyboard.press("Escape");
    await expect(page.locator("[data-slot='chart']")).toHaveCount(5);
  });

  test("unchecking a plot removes it from the page", async ({ page }) => {
    await expect(page.locator("[data-slot='chart']")).toHaveCount(4);
    await page.getByRole("button", { name: "Show / Hide Plots" }).click();
    await page.locator("label[for='plot-selected-airmass']").click();
    await page.keyboard.press("Escape");
    await expect(page.locator("[data-slot='chart']")).toHaveCount(3);
  });
});

// ---------------------------------------------------------------------------

test.describe("Show / Hide Plots — null/disabled plots", () => {
  test("plots with no non-null data are disabled and labelled (null)", async ({
    page,
  }) => {
    const mockData = generateDataLogMock(5, {
      dayobs: TEST_DAYOBS_INT,
      overrides: { airmass: null },
    });
    await setupApiMocks(page, { "data-log": mockData });
    await page.goto(PLOTS_URL);
    await waitForPlotsLoad(page);

    await page.getByRole("button", { name: "Show / Hide Plots" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    // Radix Checkbox renders as <button role="checkbox">, not <input>.
    await expect(page.locator("#plot-selected-airmass")).toBeDisabled();
    await expect(
      page.locator("label[for='plot-selected-airmass']"),
    ).toContainText("(null)");
  });
});

// ---------------------------------------------------------------------------

test.describe("Show / Hide Plots — Select All / Deselect All", () => {
  test("Deselect All hides all plots", async ({ page }) => {
    await setupApiMocks(page);
    await page.goto(PLOTS_URL);
    await waitForPlotsLoad(page);

    await page.getByRole("button", { name: "Show / Hide Plots" }).click();
    await page.getByRole("button", { name: "Deselect All" }).click();
    await page.keyboard.press("Escape");

    await expect(page.locator("[data-slot='chart']")).toHaveCount(0);
  });

  test("Select All shows plots with data but not null-only ones", async ({
    page,
  }) => {
    await setupApiMocks(page, { "data-log": "datalog-null-airmass" });
    await page.goto(PLOTS_URL);
    await waitForPlotsLoad(page);

    await page.getByRole("button", { name: "Show / Hide Plots" }).click();
    await page.getByRole("button", { name: "Deselect All" }).click();
    await page.keyboard.press("Escape");
    await expect(page.locator("[data-slot='chart']")).toHaveCount(0);

    await page.getByRole("button", { name: "Show / Hide Plots" }).click();
    // exact: true prevents substring-matching "Deselect All"
    await page.getByRole("button", { name: "Select All", exact: true }).click();
    await page.keyboard.press("Escape");

    await expect(page.locator("[data-slot='chart']")).toHaveCount(6);
    await page.getByRole("button", { name: "Show / Hide Plots" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.locator("#plot-selected-airmass")).not.toBeChecked();
    await page.keyboard.press("Escape");
  });
});
