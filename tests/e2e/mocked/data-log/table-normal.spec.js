// @ts-check
import { test, expect } from "@playwright/test";
import {
  setupDataLogMocks,
  waitForDataLogLoad,
} from "../../helpers/data-log-helpers.js";
import {
  generateDataLogMock,
  generateExposureEntriesMock,
} from "../../helpers/mock-generators.js";
import { DATA_LOG_URL, TEST_DAYOBS_INT } from "../../helpers/constants.js";

// ---------------------------------------------------------------------------
// RubinTV / Post-ISR Mosaic link
// ---------------------------------------------------------------------------

test.describe("Data Log — RubinTV link (Simonyi)", () => {
  test.beforeEach(async ({ page }) => {
    await setupDataLogMocks(page);
    await page.goto(DATA_LOG_URL);
    await waitForDataLogLoad(page);
  });

  test("first row contains a Post-ISR Mosaic link", async ({ page }) => {
    await expect(
      page.getByRole("link", { name: "Post-ISR Mosaic" }).first(),
    ).toBeVisible();
  });

  test("link opens in a new tab", async ({ page }) => {
    const link = page.getByRole("link", { name: "Post-ISR Mosaic" }).first();
    await expect(link).toHaveAttribute("target", "_blank");
  });

  test("link href contains lsstcam and focal_plane_mosaic", async ({
    page,
  }) => {
    const link = page.getByRole("link", { name: "Post-ISR Mosaic" }).first();
    const href = await link.getAttribute("href");
    expect(href).toContain("lsstcam");
    expect(href).toContain("focal_plane_mosaic");
  });

  test("link href contains the correct date string", async ({ page }) => {
    // getRubinTVUrl formats dayobs as "yyyy-MM-dd" in the date_str param
    const link = page.getByRole("link", { name: "Post-ISR Mosaic" }).first();
    const href = await link.getAttribute("href");
    expect(href).toContain("2026-01-01");
  });

  test("link href contains seq_num param", async ({ page }) => {
    const link = page.getByRole("link", { name: "Post-ISR Mosaic" }).first();
    const href = await link.getAttribute("href");
    expect(href).toMatch(/seq_num=\d+/);
  });

  test("record with no valid day_obs/seq_num renders no link", async ({
    page,
  }) => {
    // RubinTVLink returns null when getRubinTVUrl returns null (dayObs or seqNum missing)
    await setupDataLogMocks(page, {
      "data-log": generateDataLogMock(1, {
        overrides: { exposure_name: "BAD", day_obs: null, seq_num: null },
      }),
    });
    await page.goto(DATA_LOG_URL);
    await waitForDataLogLoad(page);
    const rows = page.locator("tbody tr");
    await expect(rows).toHaveCount(1);
    await expect(rows.first().locator("a")).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// Default visible columns
// ---------------------------------------------------------------------------

test.describe("Data Log — default column visibility", () => {
  test.beforeEach(async ({ page }) => {
    await setupDataLogMocks(page);
    await page.goto(DATA_LOG_URL);
    await waitForDataLogLoad(page);
  });

  const visibleHeaders = [
    "Exposure Id",
    "Science Program",
    "Obs Reason",
    "Obs Type",
    "Can See Sky",
    "Target Name",
    "Obs Start (TAI)",
    "Exposure Time (s)",
    "Filter",
    "Flags",
    "Comments",
    "RA",
    "Dec",
    "Alt",
    "Az",
    "Sky Rotation",
    "Airmass",
    "DIMM seeing",
    "Median PSF",
    "Sky Brightness",
    "Photometric ZP",
    "High SNR Source Counts",
    "Outside Air Temp",
    "RubinTV",
  ];

  for (const header of visibleHeaders) {
    test(`"${header}" is visible by default`, async ({ page }) => {
      await expect(
        page.locator("th").filter({ hasText: header }).first(),
      ).toBeVisible();
    });
  }

  const hiddenHeaders = [
    "Exposure Name",
    "Seq Num",
    "Day Obs",
    "Obs End (TAI)",
  ];

  for (const header of hiddenHeaders) {
    test(`"${header}" is hidden by default`, async ({ page }) => {
      await expect(page.locator("th").filter({ hasText: header })).toHaveCount(
        0,
      );
    });
  }
});

// ---------------------------------------------------------------------------
// Row values
// ---------------------------------------------------------------------------

test.describe("Data Log — row values", () => {
  test.beforeEach(async ({ page }) => {
    await setupDataLogMocks(page, {
      "data-log": generateDataLogMock(5, {
        overrides: {
          airmass: 1.3,
          psf_sigma_median: 2.8,
          pixel_scale_median: null,
          science_program: "SURVEY",
        },
      }),
    });
    await page.goto(DATA_LOG_URL);
    await waitForDataLogLoad(page);
  });

  test("last row shows correct exposure_id (ascending default sort)", async ({
    page,
  }) => {
    const rows = page.locator("tbody tr");
    await expect(rows).toHaveCount(5);
    await expect(rows.last()).toContainText("20260101000005");
  });

  test("science_program cells show SURVEY", async ({ page }) => {
    const rows = page.locator("tbody tr");
    for (let i = 0; i < 5; i++) {
      await expect(rows.nth(i)).toContainText("SURVEY");
    }
  });

  test("airmass cells show 1.30", async ({ page }) => {
    // formatCellValue(1.3) → inferDecimals → 2 dp → "1.30"
    const rows = page.locator("tbody tr");
    for (let i = 0; i < 5; i++) {
      await expect(rows.nth(i)).toContainText("1.30");
    }
  });

  test("psf_median is computed and displayed correctly", async ({ page }) => {
    // 2.8 * 2.355 * 0.2 = 1.3188 → toFixed(2) = "1.32"
    const rows = page.locator("tbody tr");
    for (let i = 0; i < 5; i++) {
      await expect(rows.nth(i)).toContainText("1.32");
    }
  });

  test("can_see_sky renders as string 'true'", async ({ page }) => {
    const rows = page.locator("tbody tr");
    for (let i = 0; i < 5; i++) {
      await expect(rows.nth(i)).toContainText("true");
    }
  });

  test("null airmass renders as 'na'", async ({ page }) => {
    await setupDataLogMocks(page, {
      "data-log": generateDataLogMock(1, { overrides: { airmass: null } }),
    });
    await page.goto(DATA_LOG_URL);
    await waitForDataLogLoad(page);
    await expect(page.locator("tbody tr").first()).toContainText("na");
  });

  test("exposure_flag from exposure-entries shows in Flags column", async ({
    page,
  }) => {
    await setupDataLogMocks(page, {
      "data-log": generateDataLogMock(3, { dayobs: TEST_DAYOBS_INT }),
      "exposure-entries": generateExposureEntriesMock(3, {
        dayobs: TEST_DAYOBS_INT,
        overrides: { exposure_flag: "junk" },
      }),
    });
    await page.goto(DATA_LOG_URL);
    await waitForDataLogLoad(page);
    const rows = page.locator("tbody tr");
    for (let i = 0; i < 3; i++) {
      await expect(rows.nth(i)).toContainText("junk");
    }
  });

  test("message_text from exposure-entries shows in Comments column", async ({
    page,
  }) => {
    await setupDataLogMocks(page, {
      "data-log": generateDataLogMock(3, { dayobs: TEST_DAYOBS_INT }),
      "exposure-entries": generateExposureEntriesMock(3, {
        dayobs: TEST_DAYOBS_INT,
        overrides: { message_text: "test comment" },
      }),
    });
    await page.goto(DATA_LOG_URL);
    await waitForDataLogLoad(page);
    const rows = page.locator("tbody tr");
    for (let i = 0; i < 3; i++) {
      await expect(rows.nth(i)).toContainText("test comment");
    }
  });
});

// ---------------------------------------------------------------------------
// Column tooltips
// ---------------------------------------------------------------------------

test.describe("Data Log — column tooltips", () => {
  test.beforeEach(async ({ page }) => {
    await setupDataLogMocks(page);
    await page.goto(DATA_LOG_URL);
    await waitForDataLogLoad(page);
  });

  const tooltipCases = [
    ["RubinTV", "Link to RubinTV"],
    ["Airmass", "Airmass of the observed line of sight"],
    ["Median PSF", "PSF sigma"],
    ["Outside Air Temp", "degC"],
  ];

  for (const [colHeader, expectedText] of tooltipCases) {
    test(`"${colHeader}" header shows tooltip "${expectedText}"`, async ({
      page,
    }) => {
      const tooltipTrigger = page
        .locator("th")
        .filter({ hasText: colHeader })
        .first()
        .locator(".cursor-help");
      await tooltipTrigger.hover();
      await expect(page.locator("[role='tooltip']")).toContainText(
        expectedText,
        { timeout: 5000 },
      );
    });
  }
});

// ---------------------------------------------------------------------------
// Column resizing
// ---------------------------------------------------------------------------

test.describe("Data Log — column resizing", () => {
  test.beforeEach(async ({ page }) => {
    await setupDataLogMocks(page);
    await page.goto(DATA_LOG_URL);
    await waitForDataLogLoad(page);
  });

  test("resize handle is present on column headers", async ({ page }) => {
    await expect(page.locator("th .cursor-col-resize").first()).toBeAttached();
  });

  test("dragging the resize handle changes column width", async ({ page }) => {
    // Use Exposure Id (first column, always in viewport)
    const header = page
      .locator("th")
      .filter({ hasText: "Exposure Id" })
      .first();
    await header.scrollIntoViewIfNeeded();

    const initialWidth = await header.evaluate(
      (el) => parseInt(el.style.width) || 0,
    );
    expect(initialWidth).toBeGreaterThan(0);

    const handle = header.locator(".cursor-col-resize");
    const handleBox = await handle.boundingBox();
    expect(handleBox).not.toBeNull();

    const cx = handleBox.x + handleBox.width / 2;
    const cy = handleBox.y + handleBox.height / 2;

    await page.mouse.move(cx, cy);
    await page.mouse.down();
    // Move in steps so React's mousemove events fire
    for (let i = 1; i <= 10; i++) {
      await page.mouse.move(cx + 8 * i, cy);
    }
    await page.mouse.up();

    const newWidth = await header.evaluate(
      (el) => parseInt(el.style.width) || 0,
    );
    expect(newWidth).toBeGreaterThan(initialWidth + 50);
  });
});
