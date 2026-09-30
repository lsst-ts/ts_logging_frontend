import { describe, it, expect } from "vitest";

// Load the routes first, as the app does: routes.js reads the column
// definitions at module load, and importing a column file first leaves them
// undefined through the utils -> routes import cycle.
import "@/routes";
import { contextFeedColumns } from "@/components/ContextFeedColumns";
import { dataLogColumns } from "@/components/DataLogColumns";

// Find a column definition by its id (or accessor key).
const findColumn = (columns, id) =>
  columns.find((column) => (column.id ?? column.accessorKey) === id);

describe("Context Feed column download values", () => {
  const downloadValue = (id) =>
    findColumn(contextFeedColumns, id).meta.downloadValue;

  it("exports the text of a description link, one line per <br>", () => {
    const description =
      '<a href="https://example.com/config.yaml">Scheduler config<br>fbs_config.py</a>';

    expect(downloadValue("description")(description)).toBe(
      "Scheduler config\nfbs_config.py",
    );
  });

  it("exports other descriptions, including tracebacks, in full", () => {
    const traceback = "Traceback (most recent call last):\n  File ...";

    expect(downloadValue("description")(traceback)).toBe(traceback);
  });

  it("exports missing names, descriptions and configs as empty cells", () => {
    for (const id of ["name", "description", "config"]) {
      expect(downloadValue(id)(null)).toBe("");
    }
  });

  it("formats the microsecond Time value as a UTC timestamp", () => {
    const micros = Date.UTC(2026, 0, 1, 1, 2, 3, 456) * 1000 + 789;

    expect(downloadValue("time")(micros)).toBe("2026-01-01 01:02:03.456");
  });

  it("formats Chile times in the America/Santiago timezone", () => {
    // 2026-01-01 is summer time in Chile (UTC-3).
    expect(downloadValue("event_time_chile")("2026-01-01T12:00:00Z")).toBe(
      "2026-01-01 09:00:00.000",
    );
  });
});

describe("Data Log column download values", () => {
  const downloadValue = (id) =>
    findColumn(dataLogColumns.Simonyi, id).meta.downloadValue;

  it("exports the RubinTV link as its URL", () => {
    const url = downloadValue("RubinTVLink")(undefined, {
      day_obs: 20260101,
      seq_num: 30,
      exposure_name: "MC_O_20260101_000030",
    });

    expect(url).toContain("/rubintv/");
    expect(url).toContain("date_str=2026-01-01");
    expect(url).toContain("seq_num=30");
  });

  it("derives the RubinTV link from the exposure name when needed", () => {
    const url = downloadValue("RubinTVLink")(undefined, {
      day_obs: null,
      seq_num: null,
      exposure_name: "MC_O_20260101_000030",
    });

    expect(url).toContain("date_str=2026-01-01");
    expect(url).toContain("seq_num=30");
  });

  it("exports exposure time with 2 decimals", () => {
    expect(downloadValue("exp_time")(30)).toBe("30.00");
  });
});
