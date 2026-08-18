// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import {
  waitForContextFeedLoad,
  tableRows,
  toggleToolbarCheckbox,
  groupToggleButton,
  SIMONYI_ROWS,
} from "../../helpers/contextfeed-helpers.js";
import { CONTEXTFEED_URL } from "../../helpers/constants.js";

// Group-by-task drives grouping through DataTable's imperative ref
// (tableRef.setGrouping) rather than the column header menu, so it exercises
// a path the data-log grouping tests never touch.
test.describe("Context Feed — group by task", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await page.goto(CONTEXTFEED_URL);
    await waitForContextFeedLoad(page);
  });

  test("ungrouped by default and the group toggle button is disabled", async ({
    page,
  }) => {
    await expect(tableRows(page)).toHaveCount(SIMONYI_ROWS);
    await expect(groupToggleButton(page)).toBeDisabled();
  });

  test("checking Group by Task collapses rows into task groups", async ({
    page,
  }) => {
    await toggleToolbarCheckbox(page, "Group by Task");

    // Groups start collapsed, so only the two group header rows show.
    await expect(tableRows(page)).toHaveCount(2);
    await expect(tableRows(page).nth(0)).toContainText(
      "Current Task: BLOCK-T249 (5)",
    );
    await expect(tableRows(page).nth(1)).toContainText(
      "Current Task: BLOCK-T250 (5)",
    );
  });

  test("the group toggle button becomes enabled once grouped", async ({
    page,
  }) => {
    await toggleToolbarCheckbox(page, "Group by Task");
    await expect(groupToggleButton(page)).toBeEnabled();
    await expect(groupToggleButton(page)).toHaveText("Expand All Groups");
  });

  test("Expand All Groups reveals every leaf row", async ({ page }) => {
    await toggleToolbarCheckbox(page, "Group by Task");
    await page.getByRole("button", { name: "Expand All Groups" }).click();

    // 2 group header rows + the 10 leaf rows beneath them.
    await expect(tableRows(page)).toHaveCount(2 + SIMONYI_ROWS);
    await expect(
      page.getByRole("button", { name: "Collapse All Groups" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Collapse All Groups" }).click();
    await expect(tableRows(page)).toHaveCount(2);
  });

  test("clicking a single group header expands just that group", async ({
    page,
  }) => {
    await toggleToolbarCheckbox(page, "Group by Task");
    await tableRows(page).nth(0).click();

    // First group has 5 leaf rows; the second stays collapsed.
    await expect(tableRows(page)).toHaveCount(2 + 5);
  });

  test("unchecking Group by Task restores the flat row list", async ({
    page,
  }) => {
    await toggleToolbarCheckbox(page, "Group by Task");
    await expect(tableRows(page)).toHaveCount(2);

    await toggleToolbarCheckbox(page, "Group by Task");
    await expect(tableRows(page)).toHaveCount(SIMONYI_ROWS);
  });

  test("Reset Table clears grouping and re-checks the toolbar boxes", async ({
    page,
  }) => {
    await toggleToolbarCheckbox(page, "Group by Task");
    await toggleToolbarCheckbox(page, "Collapse All Tracebacks");
    await expect(tableRows(page)).toHaveCount(2);

    await page.getByRole("button", { name: "Reset Table" }).click();

    await expect(tableRows(page)).toHaveCount(SIMONYI_ROWS);
    await expect(groupToggleButton(page)).toBeDisabled();

    const boxes = page.locator("label").filter({ hasText: "Group by Task" });
    await expect(boxes.getByRole("checkbox")).not.toBeChecked();
    await expect(
      page
        .locator("label")
        .filter({ hasText: "Collapse All Tracebacks" })
        .getByRole("checkbox"),
    ).toBeChecked();
  });
});
