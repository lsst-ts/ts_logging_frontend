// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import {
  waitForContextFeedLoad,
  tableRows,
  toggleToolbarCheckbox,
} from "../../helpers/contextfeed-helpers.js";
import { CONTEXTFEED_URL } from "../../helpers/constants.js";

// Rows in the default fixture with expandable cells.
const TRACEBACK_ROW = "maintel/track_target.py";
const TRACEBACK_TEXT = "RuntimeError: Failed to slew to target HD 12345";
const OTHER_TRACEBACK_ROW = "scriptqueue";
const OTHER_TRACEBACK_TEXT = "ValueError: Unknown script";

const YAML_ROW = "maintel/take_image.py";
const YAML_FIRST_LINE = "instrument: LSSTCam";
const YAML_BODY_TEXT = "filter: r_03";
const SINGLE_LINE_YAML_ROW = "set_summary_state.py";

const PLAIN_DESCRIPTION_ROW = "obs_specialist";

function row(page, name) {
  return tableRows(page).filter({ hasText: name });
}

test.describe("Context Feed — expandable traceback and YAML cells", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await page.goto(CONTEXTFEED_URL);
    await waitForContextFeedLoad(page);
  });

  test("tracebacks are collapsed by default", async ({ page }) => {
    const tb = row(page, TRACEBACK_ROW);
    await expect(tb).toContainText("Traceback (most recent call last):");
    await expect(tb).not.toContainText(TRACEBACK_TEXT);
    // Copy / fullscreen buttons only render while expanded.
    await expect(tb.locator("button")).toHaveCount(0);
  });

  test("clicking a traceback cell expands it, clicking again collapses", async ({
    page,
  }) => {
    const tb = row(page, TRACEBACK_ROW);

    await tb.locator("pre").click();
    await expect(tb).toContainText(TRACEBACK_TEXT);
    // Fullscreen + copy buttons appear once expanded.
    await expect(tb.locator("button")).toHaveCount(2);

    await tb.locator("pre").click();
    await expect(tb).not.toContainText(TRACEBACK_TEXT);
    await expect(tb.locator("button")).toHaveCount(0);
  });

  test("expanding one traceback leaves the other collapsed", async ({
    page,
  }) => {
    await row(page, TRACEBACK_ROW).locator("pre").click();

    await expect(row(page, TRACEBACK_ROW)).toContainText(TRACEBACK_TEXT);
    await expect(row(page, OTHER_TRACEBACK_ROW)).not.toContainText(
      OTHER_TRACEBACK_TEXT,
    );
  });

  test("Collapse All Tracebacks unchecked expands every traceback", async ({
    page,
  }) => {
    await toggleToolbarCheckbox(page, "Collapse All Tracebacks");

    await expect(row(page, TRACEBACK_ROW)).toContainText(TRACEBACK_TEXT);
    await expect(row(page, OTHER_TRACEBACK_ROW)).toContainText(
      OTHER_TRACEBACK_TEXT,
    );
  });

  test("re-checking Collapse All Tracebacks collapses every traceback", async ({
    page,
  }) => {
    await toggleToolbarCheckbox(page, "Collapse All Tracebacks");
    await expect(row(page, TRACEBACK_ROW)).toContainText(TRACEBACK_TEXT);

    await toggleToolbarCheckbox(page, "Collapse All Tracebacks");
    await expect(row(page, TRACEBACK_ROW)).not.toContainText(TRACEBACK_TEXT);
    await expect(row(page, OTHER_TRACEBACK_ROW)).not.toContainText(
      OTHER_TRACEBACK_TEXT,
    );
  });

  test("Collapse All Tracebacks does not touch plain descriptions", async ({
    page,
  }) => {
    const plain = row(page, PLAIN_DESCRIPTION_ROW);
    await expect(plain).toContainText("Seeing degraded to 1.5 arcsec.");

    await toggleToolbarCheckbox(page, "Collapse All Tracebacks");
    await expect(plain).toContainText("Seeing degraded to 1.5 arcsec.");
    // Plain text is not rendered in an expandable <pre>.
    await expect(plain.locator("pre")).toHaveCount(0);
  });

  test("YAML config is collapsed to its first line with an ellipsis", async ({
    page,
  }) => {
    const yamlRow = row(page, YAML_ROW);
    await expect(yamlRow.locator("pre")).toContainText(
      `${YAML_FIRST_LINE} ...`,
    );
    await expect(yamlRow).not.toContainText(YAML_BODY_TEXT);
  });

  test("clicking a YAML cell expands the full dumped config", async ({
    page,
  }) => {
    const yamlRow = row(page, YAML_ROW);

    await yamlRow.locator("pre").click();
    await expect(yamlRow).toContainText(YAML_BODY_TEXT);
    await expect(yamlRow).toContainText("nimages: 2");
    // Config cells expose a copy button only (no fullscreen).
    await expect(yamlRow.locator("button")).toHaveCount(1);

    await yamlRow.locator("pre").click();
    await expect(yamlRow).not.toContainText(YAML_BODY_TEXT);
  });

  test("single-line YAML has no ellipsis", async ({ page }) => {
    const single = row(page, SINGLE_LINE_YAML_ROW);
    await expect(single.locator("pre")).toContainText("enable: true");
    await expect(single.locator("pre")).not.toContainText("...");
  });

  test("Collapse All YAML toggles every config cell", async ({ page }) => {
    await toggleToolbarCheckbox(page, "Collapse All YAML");
    await expect(row(page, YAML_ROW)).toContainText(YAML_BODY_TEXT);

    await toggleToolbarCheckbox(page, "Collapse All YAML");
    await expect(row(page, YAML_ROW)).not.toContainText(YAML_BODY_TEXT);
  });

  test("the two collapse checkboxes are independent", async ({ page }) => {
    await toggleToolbarCheckbox(page, "Collapse All Tracebacks");

    await expect(row(page, TRACEBACK_ROW)).toContainText(TRACEBACK_TEXT);
    // YAML stays collapsed.
    await expect(row(page, YAML_ROW)).not.toContainText(YAML_BODY_TEXT);
  });

  test("expanding a cell does not select the row", async ({ page }) => {
    // The <pre> in traceback/YAML cells stops propagation so that expanding a
    // cell never doubles as a row click.
    const yamlRow = row(page, YAML_ROW);
    await yamlRow.locator("pre").click();

    await expect(yamlRow).toContainText(YAML_BODY_TEXT);
    await expect(page.locator("tr[data-selected='true']")).toHaveCount(0);
  });

  test("an expanded traceback opens in a fullscreen dialog", async ({
    page,
  }) => {
    const tb = row(page, TRACEBACK_ROW);
    await tb.locator("pre").click();
    await tb.locator("button").first().click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Error (Simonyi)");
    await expect(dialog).toContainText("Script SAL Index");
    await expect(dialog).toContainText("100002");
    await expect(dialog).toContainText(TRACEBACK_ROW);
    await expect(dialog).toContainText("2026-01-01 20:40:00.000");
    await expect(dialog).toContainText(TRACEBACK_TEXT);
  });
});
