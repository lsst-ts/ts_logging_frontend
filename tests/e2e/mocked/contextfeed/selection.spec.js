// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import {
  waitForContextFeedLoad,
  tableRows,
  cellByHeader,
} from "../../helpers/contextfeed-helpers.js";
import { CONTEXTFEED_URL } from "../../helpers/constants.js";

// The Context Feed's selection key is the `time` column, whose accessor
// returns microseconds since the epoch. The data-log selects on exposure_id,
// so this key type is only covered here.
// 2026-01-01T20:00:00.000Z -> 1767297600000 ms -> 1767297600000000 us
const FIRST_ROW_TIME_US = "1767297600000000";
const FIRST_ROW_NAME = "BLOCK-T249";

test.describe("Context Feed — row selection", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await page.goto(CONTEXTFEED_URL);
    await waitForContextFeedLoad(page);
  });

  test("nothing is selected on load", async ({ page }) => {
    await expect(page.locator("tr[data-selected='true']")).toHaveCount(0);
    expect(page.url()).not.toContain("selectedTime");
  });

  test("clicking a row selects it and writes selectedTime to the URL", async ({
    page,
  }) => {
    const nameCell = await cellByHeader(page, 0, "Name");
    await nameCell.click();

    await expect(page.locator("tr[data-selected='true']")).toHaveCount(1);
    await expect(page.locator("tr[data-selected='true']")).toContainText(
      FIRST_ROW_NAME,
    );
    expect(page.url()).toContain(`selectedTime=${FIRST_ROW_TIME_US}`);
  });

  test("clicking the selected row again deselects it", async ({ page }) => {
    const nameCell = await cellByHeader(page, 0, "Name");
    await nameCell.click();
    await expect(page.locator("tr[data-selected='true']")).toHaveCount(1);

    await nameCell.click();
    await expect(page.locator("tr[data-selected='true']")).toHaveCount(0);
    expect(page.url()).not.toContain("selectedTime");
  });

  test("selecting a different row moves the selection", async ({ page }) => {
    await (await cellByHeader(page, 0, "Name")).click();
    await (await cellByHeader(page, 1, "Name")).click();

    const selected = page.locator("tr[data-selected='true']");
    await expect(selected).toHaveCount(1);
    await expect(selected).toContainText("MC_O_20260101_000001");
  });

  test("selectedTime in the URL pre-selects the matching row", async ({
    page,
  }) => {
    await page.goto(`${CONTEXTFEED_URL}&selectedTime=${FIRST_ROW_TIME_US}`);
    await waitForContextFeedLoad(page);

    const selected = page.locator("tr[data-selected='true']");
    await expect(selected).toHaveCount(1);
    await expect(selected).toContainText(FIRST_ROW_NAME);
  });

  test("clicking an expandable cell does not change the selection", async ({
    page,
  }) => {
    // The <pre> in traceback/YAML cells stops propagation so that expanding
    // a cell never doubles as a row click.
    const yamlRow = tableRows(page).filter({
      hasText: "maintel/take_image.py",
    });
    await yamlRow.locator("pre").click();

    await expect(yamlRow).toContainText("filter: r_03");
    await expect(page.locator("tr[data-selected='true']")).toHaveCount(0);
  });
});
