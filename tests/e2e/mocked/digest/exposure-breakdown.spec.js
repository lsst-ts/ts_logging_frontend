// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import { generateExposuresMock } from "../../helpers/mock-generators.js";
import { downloadCsv } from "../../helpers/download-helpers.js";
import { DIGEST_URL } from "../../helpers/constants.js";

// B is seen first: two 120 s exposures. A follows: four 30 s exposures. So
// "Highest number first" puts A first by count (4 vs 2), but B first by
// time (240 s vs 120 s).
const EXPOSURES = generateExposuresMock(6, {
  postProcess: (r, i) =>
    i <= 2
      ? { ...r, science_program: "B", exp_time: 120 }
      : { ...r, science_program: "A", exp_time: 30 },
});
const FLAGS = {
  exposure_flags: [
    { obs_id: "MC_O_20260101_000001" },
    { obs_id: "MC_O_20260101_000003" },
  ],
};

function breakdownCard(page) {
  return page.locator("[data-slot='card']").filter({
    has: page.locator("[data-slot='card-title']", {
      hasText: "Exposure Breakdown",
    }),
  });
}

function downloadButton(page) {
  return breakdownCard(page).getByRole("button", { name: "Download CSV" });
}

// The bar labels, top to bottom.
function barLabels(page) {
  return breakdownCard(page).locator(".recharts-yAxis text");
}

async function selectOption(page, selectId, option) {
  await page.locator(`#${selectId}`).click();
  await page.getByRole("option", { name: option }).click();
}

test.describe("Exposure Breakdown applet — chart", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page, {
      exposures: EXPOSURES,
      "exposure-flags": FLAGS,
    });
    await page.goto(DIGEST_URL);
    await expect(barLabels(page)).toHaveCount(2);
  });

  test("plotting by number shows the exposure and flagged counts", async ({
    page,
  }) => {
    const card = breakdownCard(page);

    await expect(card).toContainText("Total exposure count: 6");
    await expect(card).toContainText(/Total flagged:\s*2/);
  });

  test("plotting by time ranks the bars by exposure time", async ({ page }) => {
    // By count (the default), A's 4 exposures outrank B's 2.
    await expect(barLabels(page)).toHaveText(["A", "B"]);

    await selectOption(page, "plotBy", "Time (s)");

    // By time, B's 240 s outranks A's 120 s.
    await expect(barLabels(page)).toHaveText(["B", "A"]);
    // Flagged: one of B's 120 s exposures and one of A's 30 s ones.
    await expect(breakdownCard(page)).toContainText(
      /Total flagged time:\s*150 s/,
    );
  });

  test("bars follow the selected sort order", async ({ page }) => {
    await selectOption(page, "sortBy", "Lowest number first");

    await expect(barLabels(page)).toHaveText(["B", "A"]);
  });
});

test.describe("Exposure Breakdown applet — download", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page, {
      exposures: EXPOSURES,
      "exposure-flags": FLAGS,
    });
  });

  test("downloads unflagged and flagged time and count per group", async ({
    page,
  }) => {
    await page.goto(DIGEST_URL);
    await expect(downloadButton(page)).toBeEnabled();

    const { filename, headers, rows } = await downloadCsv(
      page,
      downloadButton(page),
    );

    expect(filename).toBe(
      "nightlydigest_exposure-breakdown_Simonyi_20260101-20260101.csv",
    );
    expect(headers).toEqual([
      "Science program",
      "Time (unflagged, s)",
      "Time (flagged, s)",
      "Count (unflagged)",
      "Count (flagged)",
    ]);
    // In the order the groups first appear, not the chart's sort order.
    expect(rows).toEqual([
      {
        "Science program": "B",
        "Time (unflagged, s)": "120",
        "Time (flagged, s)": "120",
        "Count (unflagged)": "1",
        "Count (flagged)": "1",
      },
      {
        "Science program": "A",
        "Time (unflagged, s)": "90",
        "Time (flagged, s)": "30",
        "Count (unflagged)": "3",
        "Count (flagged)": "1",
      },
    ]);
  });
});
