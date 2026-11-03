import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildCumulativePlotModel,
  buildCumulativeStateSeries,
  buildNightHoursSeries,
  buildOpenDomeSeries,
} from "@/utils/cumulativePlotModel";
import { OBSERVATORY_STATES as STATES } from "@/constants/OBSERVATORY_STATUS_DEFINITIONS";

const ms = Date.parse;
const hour = 3600000;
const sunset = ms("2026-07-01T20:00:00Z");
const secondSunset = sunset + 24 * hour;
const thirdSunset = secondSunset + 24 * hour;
const nights = new Map(
  [sunset, secondSunset, thirdSunset].map((start, index) => [
    20260701 + index,
    {
      dayObs: 20260701 + index,
      sunsetMs: start,
      sunriseMs: start + 8 * hour,
      nightHours: 8,
      // The middle night has no dome activity.
      intervals:
        index === 1
          ? []
          : [
              {
                open_time: new Date(start + hour).toISOString(),
                close_time: new Date(start + 3 * hour).toISOString(),
                open_hours: 2,
              },
            ],
    },
  ]),
);
const intervals = [sunset, thirdSunset].map((start) => ({
  start_time_ms: start + hour,
  end_time_ms: start + 3 * hour,
  start_state: STATES.OPERATIONAL | STATES.WEATHER,
  end_state: STATES.OPERATIONAL | STATES.WEATHER,
  start_labels: ["OPERATIONAL", "WEATHER"],
  end_labels: ["OPERATIONAL", "WEATHER"],
  start_note: "Observing in weather",
}));

describe("cumulative plots across nights", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-15T23:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("carries night hours through each sunset without line separators", () => {
    expect(buildNightHoursSeries(nights, true)).toEqual([
      [sunset, 0],
      [sunset + 8 * hour, 8],
      [secondSunset, 8],
      [secondSunset + 8 * hour, 16],
      [thirdSunset, 16],
      [thirdSunset + 8 * hour, 24],
    ]);
    expect(buildNightHoursSeries(nights, false).at(-2)).toEqual([
      thirdSunset + 8 * hour,
      8,
    ]);
  });

  it("carries dome hours across a night with no openings", () => {
    expect(buildOpenDomeSeries(nights, true)).toEqual([
      [sunset + hour, 0],
      [sunset + 3 * hour, 2],
      [sunset + 8 * hour, 2],
      [thirdSunset + hour, 2],
      [thirdSunset + 3 * hour, 4],
      [thirdSunset + 8 * hour, 4],
    ]);
    expect(buildOpenDomeSeries(nights, false).at(-2)).toEqual([
      thirdSunset + 8 * hour,
      2,
    ]);
  });

  it("accumulates overlapping states independently and preserves marker metadata", () => {
    const result = buildCumulativeStateSeries(intervals, nights, true);
    for (const state of ["OPERATIONAL", "WEATHER"]) {
      expect(result[state].at(-1).value).toEqual([thirdSunset + 8 * hour, 4]);
      expect(result[state]).toContainEqual({
        value: [secondSunset, 2],
        showMarker: false,
      });
      expect(result[state].some((point) => Number.isNaN(point.value[1]))).toBe(
        false,
      );
      expect(result[state]).toContainEqual(
        expect.objectContaining({
          value: [thirdSunset + hour, 2],
          showMarker: true,
          note: "Observing in weather",
          duration: 2 * hour,
        }),
      );
    }
    expect(result.FAULT.at(-1).value[1]).toBe(0);
    const reset = buildCumulativeStateSeries(intervals, nights, false);
    expect(reset.OPERATIONAL.at(-2).value[1]).toBe(2);
    expect(
      reset.OPERATIONAL.filter((point) => Number.isNaN(point.value[1])),
    ).toHaveLength(3);
  });

  it("passes accumulation through the assembled model for all three overlays", () => {
    const almanac = [2, 3, 4].map((day, index) => ({
      dayobs: 20260700 + day,
      twilight_evening_12deg: new Date(sunset + index * 24 * hour)
        .toISOString()
        .slice(0, 19)
        .replace("T", " "),
      twilight_morning_12deg: new Date(sunset + index * 24 * hour + 8 * hour)
        .toISOString()
        .slice(0, 19)
        .replace("T", " "),
      night_hours: 8,
    }));
    const dome = [...nights.values()].flatMap((night) =>
      night.intervals.map((interval) => ({
        ...interval,
        day_obs: night.dayObs,
      })),
    );
    const model = buildCumulativePlotModel(almanac, intervals, dome, true);
    expect(model.nightHours.at(-1)[1]).toBe(24);
    expect(model.openDomeSeries.at(-1)[1]).toBe(4);
    expect(model.stateSeries.OPERATIONAL.at(-1).value[1]).toBe(4);
    expect(model.breaks).toHaveLength(2);
  });
});

describe("accumulation into the current observing night", () => {
  const currentSunset = ms("2026-07-02T20:00:00Z");
  const currentSunrise = ms("2026-07-03T04:00:00Z");
  const currentNights = new Map([
    [20260701, nights.get(20260701)],
    [
      20260702,
      {
        dayObs: 20260702,
        sunsetMs: currentSunset,
        sunriseMs: currentSunrise,
        nightHours: 8,
        intervals: [],
      },
    ],
  ]);
  const historical = {
    ...intervals[0],
    start_state: STATES.OPERATIONAL,
    end_state: STATES.OPERATIONAL,
  };
  const current = {
    ...historical,
    start_time_ms: currentSunset + hour,
    end_time_ms: currentSunset + 2 * hour,
  };
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it.each([
    ["ongoing", "2026-07-02T23:00:00Z", currentSunset + 3 * hour, 4],
    ["after sunrise", "2026-07-03T08:00:00Z", currentSunrise, 9],
  ])(
    "carries historical state hours into the %s night and respects the cutoff",
    (_, now, cutoff, hours) => {
      vi.setSystemTime(new Date(now));
      const result = buildCumulativeStateSeries(
        [historical, current],
        currentNights,
        true,
      );
      expect(result.OPERATIONAL).toContainEqual({
        value: [currentSunset, 2],
        showMarker: false,
      });
      expect(result.OPERATIONAL.at(-2).value).toEqual([cutoff, hours]);
      expect(result.WEATHER.at(-2).value).toEqual([cutoff, 0]);
    },
  );

  it.each([null, "2026-07-02T22:00:00Z"])(
    "carries dome hours when the current interval closes at %s",
    (close_time) => {
      vi.setSystemTime(new Date("2026-07-02T23:00:00Z"));
      const data = new Map(currentNights);
      data.set(20260702, {
        ...currentNights.get(20260702),
        intervals: [
          {
            open_time: "2026-07-02T21:00:00Z",
            close_time,
            open_hours: close_time ? 1 : 2,
          },
        ],
      });
      const result = buildOpenDomeSeries(data, true);
      expect(result.at(-1)).toEqual([
        currentSunset + 3 * hour,
        close_time ? 3 : 4,
      ]);
      expect(result).toContainEqual([currentSunset + hour, 2]);
    },
  );

  // SSW-2999: convert to a normal test after fixing.
  it.fails(
    "SSW-2999: clips the carried state at sunset when the latest event predates the current night",
    () => {
      vi.setSystemTime(new Date("2026-07-02T23:00:00Z"));
      const beforeSunset = {
        ...historical,
        start_time_ms: currentSunset - 2 * hour,
        end_time_ms: currentSunset - hour,
      };
      const result = buildCumulativeStateSeries(
        [historical, beforeSunset],
        currentNights,
        true,
      );
      expect(result.OPERATIONAL.at(-2).value).toEqual([
        currentSunset + 3 * hour,
        5,
      ]);
      const marker = result.OPERATIONAL.find((point) => point.clippedAtSunset);
      expect(marker.value).toEqual([currentSunset, 2]);
      expect(
        result.OPERATIONAL.filter(
          (point) => point.value[0] >= currentSunset,
        ).every((point) => Number.isNaN(point.value[1]) || point.value[1] >= 2),
      ).toBe(true);
    },
  );
});
