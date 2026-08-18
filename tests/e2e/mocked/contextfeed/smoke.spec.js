// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import {
  waitForContextFeedLoad,
  getContextFeedUrl,
  tableRows,
  SIMONYI_ROWS,
  AUXTEL_ROWS,
} from "../../helpers/contextfeed-helpers.js";
import { CONTEXTFEED_URL } from "../../helpers/constants.js";

test.describe("Context Feed page — smoke", () => {
  test("loads with heading, rows and no console errors", async ({ page }) => {
    const consoleErrors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        // Pre-existing Recharts internal warning, not caused by our code.
        if (text.includes("Each child in a list should have a unique")) return;
        consoleErrors.push(text);
      }
    });

    await setupApiMocks(page);
    await page.goto(CONTEXTFEED_URL);
    await waitForContextFeedLoad(page);

    await expect(
      page.locator("[data-slot='card-title']").first(),
    ).toContainText("Context Feed");
    await expect(
      page.getByText(
        "Chronologically ordered log of exposures, scripts, errors and narrations.",
      ),
    ).toBeVisible();

    await expect(tableRows(page)).toHaveCount(SIMONYI_ROWS);
    expect(consoleErrors).toHaveLength(0);
  });

  test("toolbar controls are present", async ({ page }) => {
    await setupApiMocks(page);
    await page.goto(CONTEXTFEED_URL);
    await waitForContextFeedLoad(page);

    await expect(
      page.getByRole("button", { name: "Show / Hide Columns" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: /Expand All Groups|Collapse All Groups/,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Reset Table" }),
    ).toBeVisible();

    for (const label of [
      "Group by Task",
      "Collapse All Tracebacks",
      "Collapse All YAML",
    ]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }
  });

  test("default visible columns match the column config", async ({ page }) => {
    await setupApiMocks(page);
    await page.goto(CONTEXTFEED_URL);
    await waitForContextFeedLoad(page);

    // defaultColumnVisibility in ContextFeedColumns.jsx, in defaultColumnOrder
    for (const header of [
      "Event Type",
      "Time (UTC)",
      "Name",
      "Description",
      "Config",
      "Script SAL Index",
      "Final Status",
    ]) {
      await expect(
        page.getByRole("columnheader").filter({ hasText: header }).first(),
      ).toBeVisible();
    }

    // Hidden by default
    for (const header of ["Category Index", "Current Task", "Dayobs"]) {
      await expect(
        page.getByRole("columnheader").filter({ hasText: header }),
      ).toHaveCount(0);
    }
  });

  test("rows are in chronological order by default", async ({ page }) => {
    await setupApiMocks(page);
    await page.goto(CONTEXTFEED_URL);
    await waitForContextFeedLoad(page);

    const rows = tableRows(page);
    await expect(rows.first()).toContainText("2026-01-01 20:00:00.000");
    await expect(rows.last()).toContainText("2026-01-01 22:10:00.000");
  });

  test("AuxTel default filters show only AuxTel-relevant events", async ({
    page,
  }) => {
    await setupApiMocks(page);
    await page.goto(getContextFeedUrl("20260101", "AuxTel"));
    await waitForContextFeedLoad(page);

    await expect(tableRows(page)).toHaveCount(AUXTEL_ROWS);
    await expect(page.locator("[data-slot='table-body']")).toContainText(
      "AT_O_20260101_000001",
    );
    await expect(page.locator("[data-slot='table-body']")).not.toContainText(
      "MC_O_20260101_000001",
    );
  });

  test("empty data shows the no-data banner and no rows", async ({ page }) => {
    await setupApiMocks(page, { "context-feed": { data: [], cols: [] } });
    await page.goto(CONTEXTFEED_URL);
    await waitForContextFeedLoad(page);

    await expect(page.getByText("No Context Feed entries found")).toBeVisible();
    await expect(tableRows(page)).toHaveCount(0);
  });

  test("a context-feed 500 shows an error banner", async ({ page }) => {
    await setupApiMocks(page);
    await page.route("**/nightlydigest/api/context-feed*", (route) =>
      route.fulfill({ status: 500, json: { detail: "boom" } }),
    );
    await page.goto(CONTEXTFEED_URL);
    await waitForContextFeedLoad(page);

    // Error notifications are merged into a single banner naming the sources
    // that failed (see mergeErrorNotifications in NotificationContext).
    await expect(
      page.getByText("One or more data sources are unavailable."),
    ).toBeVisible();
    await expect(page.getByText(/context-feed failed to load/)).toBeVisible();
  });
});
