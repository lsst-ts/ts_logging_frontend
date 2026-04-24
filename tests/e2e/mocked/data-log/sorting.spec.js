// @ts-check
import { test, expect } from "@playwright/test";
import {
  setupDataLogMocks,
  waitForDataLogLoad,
  clickColumnMenuItem,
} from "../../helpers/data-log-helpers.js";
import { generateDataLogMock } from "../../helpers/mock-generators.js";
import { DATA_LOG_URL } from "../../helpers/constants.js";

/**
 * Returns the text content of all visible cells in a named column.
 * Finds the column index from the thead, then reads each tbody row at that index.
 */
async function getColumnCellValues(page, columnHeader) {
  const headers = await page.locator("thead th").all();
  let colIndex = -1;
  for (let i = 0; i < headers.length; i++) {
    const text = await headers[i].textContent();
    if (text?.includes(columnHeader)) {
      colIndex = i;
      break;
    }
  }
  if (colIndex < 0) throw new Error(`Column "${columnHeader}" not found`);

  const rows = await page.locator("tbody tr").all();
  const values = [];
  for (const row of rows) {
    const cells = await row.locator("td").all();
    if (colIndex < cells.length) {
      values.push(((await cells[colIndex].textContent()) ?? "").trim());
    }
  }
  return values;
}

// ---------------------------------------------------------------------------
// Sorting tests
// ---------------------------------------------------------------------------

test.describe("Data Log — sorting", () => {
  test.beforeEach(async ({ page }) => {
    await setupDataLogMocks(page, {
      "data-log": generateDataLogMock(10, {
        postProcess: (r) => ({ ...r, airmass: 1.0 + r.seq_num * 0.1 }),
      }),
    });
    await page.goto(DATA_LOG_URL);
    await waitForDataLogLoad(page);
  });

  test("default sort is exposure_id ascending", async ({ page }) => {
    const values = await getColumnCellValues(page, "Exposure Id");
    expect(values[0]).toBe("20260101000001");
    expect(values[values.length - 1]).toBe("20260101000010");
  });

  test("sort airmass ascending via ⋮ menu", async ({ page }) => {
    await clickColumnMenuItem(page, "Airmass", "Sort by asc.");

    const values = await getColumnCellValues(page, "Airmass");
    // airmass = 1.0 + seq_num * 0.1; seq_num 1→1.1, seq_num 10→2.0
    // inferDecimals: non-integer < 100 → 2 dp; 2.0 is integer → 0 dp
    expect(values[0]).toBe("1.10");
    expect(values[values.length - 1]).toBe("2"); // 2.0 is integer → formatted as "2"
  });

  test("sort airmass descending after ascending", async ({ page }) => {
    await clickColumnMenuItem(page, "Airmass", "Sort by asc.");
    await expect(
      page.locator("th").filter({ hasText: "Airmass" }).first(),
    ).toContainText("🔼");
    await clickColumnMenuItem(page, "Airmass", "Sort by desc.");

    const values = await getColumnCellValues(page, "Airmass");
    expect(values[0]).toBe("2"); // 2.0 is integer → "2"
    expect(values[values.length - 1]).toBe("1.10");
  });

  test("sort by string column (Science Program) puts rows in alpha order", async ({
    page,
  }) => {
    await setupDataLogMocks(page, {
      "data-log": generateDataLogMock(3, {
        postProcess: (r) => ({
          ...r,
          science_program: ["CALIB", "BLOCK", "SURVEY"][r.seq_num - 1],
        }),
      }),
    });
    await page.goto(DATA_LOG_URL);
    await waitForDataLogLoad(page);

    await clickColumnMenuItem(page, "Science Program", "Sort by asc.");

    const values = await getColumnCellValues(page, "Science Program");
    expect(values).toEqual(["BLOCK", "CALIB", "SURVEY"]);
  });

  test("sort by null airmass does not crash", async ({ page }) => {
    await setupDataLogMocks(page, {
      "data-log": generateDataLogMock(5, {
        postProcess: (r) => ({
          ...r,
          airmass: r.seq_num === 3 ? null : r.airmass,
        }),
      }),
    });
    await page.goto(DATA_LOG_URL);
    await waitForDataLogLoad(page);

    await clickColumnMenuItem(page, "Airmass", "Sort by asc.");

    // Page should not crash — data rows still present
    await expect(page.locator("tbody tr")).toHaveCount(5);
  });

  test("Reset Table clears sort and restores exposure_id ascending", async ({
    page,
  }) => {
    await clickColumnMenuItem(page, "Airmass", "Sort by asc.");
    await page.getByRole("button", { name: "Reset Table" }).click();

    const values = await getColumnCellValues(page, "Exposure Id");
    expect(values[0]).toBe("20260101000001");

    // Sort indicator should be gone from Airmass header
    const airmassHeader = page
      .locator("th")
      .filter({ hasText: "Airmass" })
      .first();
    await expect(airmassHeader).not.toContainText("🔼");
    await expect(airmassHeader).not.toContainText("🔽");
  });

  test("sort indicator shows 🔼 for ascending", async ({ page }) => {
    await clickColumnMenuItem(page, "Airmass", "Sort by asc.");

    const airmassHeader = page
      .locator("th")
      .filter({ hasText: "Airmass" })
      .first();
    await expect(airmassHeader).toContainText("🔼");
  });

  test("sort indicator shows 🔽 for descending", async ({ page }) => {
    await clickColumnMenuItem(page, "Airmass", "Sort by asc.");
    await expect(
      page.locator("th").filter({ hasText: "Airmass" }).first(),
    ).toContainText("🔼");
    await clickColumnMenuItem(page, "Airmass", "Sort by desc.");

    const airmassHeader = page
      .locator("th")
      .filter({ hasText: "Airmass" })
      .first();
    await expect(airmassHeader).toContainText("🔽");
  });
});
