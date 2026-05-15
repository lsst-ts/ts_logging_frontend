// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import {
  waitForDataLogLoad,
  getDataLogUrl,
} from "../../helpers/datalog-helpers.js";

const DATALOG_URL = getDataLogUrl();

test.describe("Data-log page — smoke", () => {
  test("loads with correct heading, 30 rows, and no errors", async ({
    page,
  }) => {
    const consoleErrors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        // Exclude a pre-existing Recharts internal warning (not caused by our code)
        if (text.includes("Each child in a list should have a unique")) return;
        consoleErrors.push(text);
      }
    });

    await setupApiMocks(page);
    await page.goto(DATALOG_URL);
    await waitForDataLogLoad(page);

    // PageHeader uses CardTitle (a div, not a heading element)
    await expect(page.locator("[data-slot='card-title']")).toContainText(
      "Data Log",
    );
    await expect(
      page.getByText("Exposure metadata and related fields"),
    ).toBeVisible();
    await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(30);

    await expect(
      page.getByText("Error fetching data from ConsDB!"),
    ).not.toBeVisible();
    await expect(
      page.getByText("Error fetching exposure log data!"),
    ).not.toBeVisible();
    await expect(page.getByText("Error fetching almanac!")).not.toBeVisible();

    expect(consoleErrors).toHaveLength(0);
  });

  test("toolbar buttons and timeline are present", async ({ page }) => {
    await setupApiMocks(page);
    await page.goto(DATALOG_URL);
    await waitForDataLogLoad(page);

    await expect(
      page.getByRole("button", { name: "Show / Hide Columns" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Reset Table" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Hide Timeline" }),
    ).toBeVisible();
  });

  test("skeletons appear while loading then disappear", async ({ page }) => {
    await setupApiMocks(page);
    // Delay data-log (LIFO: this handler runs first, then continues to setupApiMocks mock)
    await page.route("**/nightlydigest/api/data-log*", async (route) => {
      await new Promise((r) => setTimeout(r, 600));
      await route.continue();
    });

    await page.goto(DATALOG_URL);

    await expect(page.locator("[data-slot='skeleton']").first()).toBeVisible();

    await waitForDataLogLoad(page);
    await expect(page.locator("[data-slot='skeleton']")).toHaveCount(0);
  });
});
