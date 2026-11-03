import { describe, expect, it } from "vitest";
import { buildCumulativePlotOption } from "@/utils/cumulativePlotOption";
import {
  STATUS_CUMULATIVE_FONTS,
  STATUS_CUMULATIVE_VARIABLE_DIMENSIONS,
  STATUS_CUMULATIVE_SYMBOL_SIZE,
} from "@/constants/OBSERVATORY_STATUS_DEFINITIONS";

const marker = {
  value: [Date.parse("2026-07-01T21:00:00Z"), 1],
  stateName: "OPERATIONAL",
  time_ms: Date.parse("2026-07-01T21:00:00Z"),
  duration: 3600000,
  status: "OPERATIONAL",
  hasNote: true,
  note: `<script>alert("x" & 'y')</script>`,
  clippedAtSunset: true,
};
const options = (overrides = {}) =>
  buildCumulativePlotOption({
    model: {
      breaks: [{ start: 200, end: 300, gap: "2%" }],
      nightHours: [
        [100, 8],
        [400, 8],
      ],
      openDomeSeries: [
        [100, 0],
        [400, 2],
      ],
      stateSeries: { OPERATIONAL: [{ value: [100, 0] }] },
    },
    markerData: [marker],
    markerSize: STATUS_CUMULATIVE_SYMBOL_SIZE.APPLET,
    fontSize: STATUS_CUMULATIVE_FONTS.APPLET,
    variableDimensions: STATUS_CUMULATIVE_VARIABLE_DIMENSIONS.APPLET,
    ...overrides,
  });

describe("cumulative plot options", () => {
  it("keeps night bounds and state series while suppressing overlays in the no-data shell", () => {
    const ready = options();
    expect(ready.series.find((s) => s.id === "night-hours").data).toEqual([
      [100, 8],
      [400, 8],
    ]);
    expect(ready.series.find((s) => s.id === "open-dome").data.at(-1)[1]).toBe(
      2,
    );
    const empty = options({ noData: true, markerData: [] });
    expect(empty.xAxis.min).toBe(100);
    expect(empty.xAxis.max).toBe(400);
    expect(
      empty.series.some((s) => ["night-hours", "open-dome"].includes(s.id)),
    ).toBe(false);
    expect(
      empty.series
        .filter((s) => s.id.startsWith("state-marker-"))
        .every((s) => s.data.length === 0),
    ).toBe(true);
  });

  it("uses explicit zoom bounds and the requested title", () => {
    const option = options({
      xDomain: [150, 350],
      yDomain: [0, 4],
      plotTitle: "Across nights",
    });
    expect(option.xAxis.min).toBe(150);
    expect(option.xAxis.max).toBe(350);
    expect(option.yAxis.min).toBe(0);
    expect(option.yAxis.max).toBe(4);
    expect(option.title.text).toBe("Across nights");
  });

  it("formats marker details and escapes notes as text", () => {
    const format = options().tooltip.formatter;
    const html = format({ seriesType: "scatter", data: marker });
    expect(html).toContain("2026-07-01 21:00:00.000");
    expect(html).toContain("01:00:00.000");
    expect(html).toContain("OPERATIONAL");
    expect(html).toContain("duration is clipped");
    expect(html).toContain(
      "&lt;script&gt;alert(&quot;x&quot; &amp; &#039;y&#039;)&lt;/script&gt;",
    );
    expect(html).not.toContain("<script>");
    const withoutNote = format({
      seriesType: "scatter",
      data: { ...marker, note: null, clippedAtSunset: false },
    });
    expect(withoutNote).not.toContain("Note:");
    expect(withoutNote).not.toContain("duration is clipped");
    expect(format({ seriesType: "line" })).toBeUndefined();
  });

  it("distinguishes noted markers from status-only markers", () => {
    const series = options().series.find(
      (s) => s.type === "scatter" && s.data?.includes(marker),
    );
    expect(series.symbol(null, { data: marker })).toBe("diamond");
    expect(series.symbolSize(null, { data: marker })).toBe(
      STATUS_CUMULATIVE_SYMBOL_SIZE.APPLET.WITH_NOTE,
    );
    const noNote = { data: { ...marker, hasNote: false } };
    expect(series.symbol(null, noNote)).toBe("circle");
    expect(series.symbolSize(null, noNote)).toBe(
      STATUS_CUMULATIVE_SYMBOL_SIZE.APPLET.WITHOUT_NOTE,
    );
  });
});
