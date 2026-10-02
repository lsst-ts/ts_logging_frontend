// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import { downloadCsv } from "../../helpers/download-helpers.js";
import { TIME_ACCOUNTING_URL } from "../../helpers/constants.js";

const entry = (fields) => ({
  id: "entry",
  date_added: "2026-01-02T02:00:00.000",
  date_begin: "2026-01-02T01:30:00.000",
  date_end: "2026-01-02T02:00:00.000",
  message_text: "Dome stuck",
  time_lost: 1.5,
  time_lost_type: "fault",
  urls: [],
  tags: [],
  user_id: "alice@lsst.org",
  components_json: { name: "Simonyi", children: [] },
  ...fields,
});

// Only the first entry is a fault with time lost, so only it is shown.
const NARRATIVE_LOG = {
  time_lost_to_weather: 2,
  time_lost_to_faults: 1.5,
  narrative_log: [
    entry({
      id: "fault-1",
      urls: [
        "https://rubinobs.atlassian.net/browse/OBS-1",
        "https://rubinobs.atlassian.net/browse/OBS-2",
      ],
      tags: ["dome", "fault"],
      components_json: {
        name: "Simonyi",
        children: [{ name: "Dome", children: [] }],
      },
    }),
    entry({ id: "no-loss", time_lost: 0 }),
    entry({ id: "weather", time_lost: 2, time_lost_type: "weather" }),
  ],
};

function downloadButton(page) {
  return page
    .locator("[data-slot='card']")
    .filter({ hasText: "Narrative Log Entries with Fault Time Loss" })
    .getByRole("button", { name: "Download CSV" });
}

test.describe("Time Accounting — Narrative Log download", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page, { "narrative-log": NARRATIVE_LOG });
    await page.goto(TIME_ACCOUNTING_URL);
  });

  test("downloads the fault entries with time lost", async ({ page }) => {
    const { filename, headers, rows } = await downloadCsv(
      page,
      downloadButton(page),
    );

    expect(filename).toBe(
      "nightlydigest_narrative-log_Simonyi_20260101-20260101.csv",
    );
    expect(rows.map((row) => row.id)).toEqual(["fault-1"]);
    // Every field the backend returns, plus the flat component column.
    expect(headers).toEqual([...Object.keys(entry({})), "component"]);
  });

  test("flattens the list and component fields", async ({ page }) => {
    const { rows } = await downloadCsv(page, downloadButton(page));
    const [row] = rows;

    expect(row.urls).toBe(
      "https://rubinobs.atlassian.net/browse/OBS-1; https://rubinobs.atlassian.net/browse/OBS-2",
    );
    expect(row.tags).toBe("dome; fault");
    expect(row.component).toBe("Simonyi: {Dome}");
    expect(JSON.parse(row.components_json)).toEqual({
      name: "Simonyi",
      children: [{ name: "Dome", children: [] }],
    });
    expect(row.time_lost).toBe("1.5");
    expect(row.message_text).toBe("Dome stuck");
  });
});
