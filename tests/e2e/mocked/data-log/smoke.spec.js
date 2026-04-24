// @ts-check
import { test, expect } from "@playwright/test";
import {
  setupDataLogMocks,
  waitForDataLogLoad,
} from "../../helpers/data-log-helpers.js";
import { DATA_LOG_URL } from "../../helpers/constants.js";

test.describe("Data Log page — smoke", () => {
  test.beforeEach(async ({ page }) => {
    await setupDataLogMocks(page);
    await page.goto(DATA_LOG_URL);
    await waitForDataLogLoad(page);
  });

  test("loads without console errors", async ({ page }) => {
    const consoleErrors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        // Pre-existing Recharts warning about key props on Line children — not actionable here.
        if (text.includes("Each child in a list should have a unique")) return;
        consoleErrors.push(text);
      }
    });
    await setupDataLogMocks(page);
    await page.goto(DATA_LOG_URL);
    await waitForDataLogLoad(page);
    expect(consoleErrors).toHaveLength(0);
  });

  test("page header shows correct title", async ({ page }) => {
    await expect(page.locator("[data-slot='card-title']")).toContainText(
      "Data Log:",
    );
  });

  test("page description is visible", async ({ page }) => {
    await expect(
      page.getByText("Exposure metadata and related fields"),
    ).toBeVisible();
  });

  test("table renders correct row count", async ({ page }) => {
    // 30 data rows + 1 header row
    await expect(page.getByRole("row")).toHaveCount(31);
  });

  test("no error toasts on normal load", async ({ page }) => {
    await expect(
      page.locator("[data-sonner-toast][data-type='error']"),
    ).toHaveCount(0);
  });

  test('"Reset Table" button is visible', async ({ page }) => {
    await expect(
      page.getByRole("button", { name: "Reset Table" }),
    ).toBeVisible();
  });

  test('"Show / Hide Columns" button is visible', async ({ page }) => {
    await expect(
      page.getByRole("button", { name: "Show / Hide Columns" }),
    ).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Skeleton loading test — needs its own setup to delay the fetch
// ---------------------------------------------------------------------------

test.describe("Data Log page — loading skeletons", () => {
  test("skeleton rows appear during fetch then disappear", async ({ page }) => {
    await setupDataLogMocks(page);
    // Register a delayed override (LIFO — takes precedence over the one above)
    await page.route("**/nightlydigest/api/data-log*", async (route) => {
      await new Promise((r) => setTimeout(r, 400));
      await route.fulfill({ json: { data_log: [] } });
    });
    await page.goto(DATA_LOG_URL);
    // Skeleton cells inside tbody should be visible while loading
    await expect(page.locator("tbody .bg-teal-700").first()).toBeVisible();
    // After load completes, skeleton cells inside tbody should be gone
    await waitForDataLogLoad(page);
    await expect(page.locator("tbody .bg-teal-700")).toHaveCount(0);
  });
});
