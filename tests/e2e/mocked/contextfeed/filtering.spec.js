// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import { applyFilter } from "../../helpers/datalog-helpers.js";
import {
  waitForContextFeedLoad,
  tableRows,
  toggleEventType,
  clearColumnFilter,
  SIMONYI_ROWS,
} from "../../helpers/contextfeed-helpers.js";
import { CONTEXTFEED_URL } from "../../helpers/constants.js";

test.describe("Context Feed — event type filtering", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await page.goto(CONTEXTFEED_URL);
    await waitForContextFeedLoad(page);
  });

  test("timeline checkboxes drive the table filter", async ({ page }) => {
    await expect(tableRows(page)).toHaveCount(SIMONYI_ROWS);

    // The fixture has two Simonyi Exposure rows.
    await toggleEventType(page, "Simonyi Exposure");
    await expect(tableRows(page)).toHaveCount(SIMONYI_ROWS - 2);
    await expect(page.locator("[data-slot='table-body']")).not.toContainText(
      "MC_O_20260101_000001",
    );

    await toggleEventType(page, "Simonyi Exposure");
    await expect(tableRows(page)).toHaveCount(SIMONYI_ROWS);
  });

  test("checking an excluded event type adds its rows", async ({ page }) => {
    // AuxTel Exposure is off by default under the Simonyi telescope.
    await toggleEventType(page, "AuxTel Exposure");

    await expect(tableRows(page)).toHaveCount(SIMONYI_ROWS + 1);
    await expect(page.locator("[data-slot='table-body']")).toContainText(
      "AT_O_20260101_000001",
    );
  });

  test("the event_type filter round-trips through the URL", async ({
    page,
  }) => {
    await toggleEventType(page, "Simonyi Exposure");
    await expect(tableRows(page)).toHaveCount(SIMONYI_ROWS - 2);

    const url = decodeURIComponent(page.url());
    expect(url).toContain("event_type");
    expect(url).not.toContain("Simonyi Exposure");

    // The filter survives a reload.
    await page.reload();
    await waitForContextFeedLoad(page);
    await expect(tableRows(page)).toHaveCount(SIMONYI_ROWS - 2);
  });

  test("clearing the event type filter hides every row", async ({ page }) => {
    // event_type carries preserveEmptyFilter, so Clear must store an empty
    // array (match nothing) rather than removing the filter (match all).
    await clearColumnFilter(page, "Event Type");

    await expect(tableRows(page)).toHaveCount(0);
  });

  test("applying a single event type from the column menu narrows the table", async ({
    page,
  }) => {
    await clearColumnFilter(page, "Event Type");
    await expect(tableRows(page)).toHaveCount(0);

    await applyFilter(page, "Event Type", "Simonyi Exposure");

    await expect(tableRows(page)).toHaveCount(2);
    await expect(page.locator("[data-slot='table-body']")).toContainText(
      "MC_O_20260101_000001",
    );
  });

  test("timeline checkboxes reflect a filter applied from the column menu", async ({
    page,
  }) => {
    await clearColumnFilter(page, "Event Type");
    await expect(tableRows(page)).toHaveCount(0);

    // Every timeline checkbox should now read unchecked.
    const checkboxes = page
      .locator("div.flex.items-center.space-x-2")
      .filter({ has: page.getByText("Simonyi Exposure", { exact: true }) })
      .getByRole("checkbox");
    await expect(checkboxes).not.toBeChecked();
  });

  test("Reset Table restores the telescope default filters", async ({
    page,
  }) => {
    await toggleEventType(page, "Simonyi Exposure");
    await expect(tableRows(page)).toHaveCount(SIMONYI_ROWS - 2);

    await page.getByRole("button", { name: "Reset Table" }).click();
    await expect(tableRows(page)).toHaveCount(SIMONYI_ROWS);
  });
});
