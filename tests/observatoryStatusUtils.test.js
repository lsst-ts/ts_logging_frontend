import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

import {
  buildCumulativePlotModel,
  buildCumulativeStateSeries,
  buildDayBreaks,
  buildNightHoursSeries,
  buildNightMetadataMap,
  buildOpenDomeSeries,
} from "../src/utils/observatoryStatusUtils";
import { OBSERVATORY_STATES } from "@/constants/OBSERVATORY_STATUS_DEFINITIONS";
import * as timeUtils from "@/utils/timeUtils";

function makeNight({
  dayObs = 20260701,
  sunsetMs = 1000,
  sunriseMs = 2000,
  nightHours = 10,
  intervals = [],
} = {}) {
  return {
    dayObs,
    sunsetMs,
    sunriseMs,
    nightHours,
    intervals,
  };
}

const ms = (iso) => Date.parse(iso);
const STATE = OBSERVATORY_STATES.OPERATIONAL;

describe("buildDayBreaks", () => {
  it("returns an empty array for no nights", () => {
    expect(buildDayBreaks(new Map())).toEqual([]);
  });

  it("returns no breaks for a single night", () => {
    const nights = new Map([[20260701, makeNight()]]);

    expect(buildDayBreaks(nights)).toEqual([]);
  });

  it("creates breaks between consecutive nights", () => {
    const nights = new Map([
      [
        20260701,
        makeNight({
          sunriseMs: 2000,
        }),
      ],
      [
        20260702,
        makeNight({
          dayObs: 20260702,
          sunsetMs: 3000,
          sunriseMs: 4000,
        }),
      ],
      [
        20260703,
        makeNight({
          dayObs: 20260703,
          sunsetMs: 5000,
          sunriseMs: 6000,
        }),
      ],
    ]);

    expect(buildDayBreaks(nights)).toEqual([
      {
        start: 2000,
        end: 3000,
        gap: "2%",
      },
      {
        start: 4000,
        end: 5000,
        gap: "2%",
      },
    ]);
  });
});

describe("buildOpenDomeSeries", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns an empty array when there are no nights", () => {
    expect(buildOpenDomeSeries(new Map())).toEqual([]);
  });

  it("skips nights with no dome intervals", () => {
    const nights = new Map([
      [
        20260710,
        makeNight({
          sunsetMs: ms("2026-07-10T08:00:00Z"),
          sunriseMs: ms("2026-07-11T06:00:00Z"),
          intervals: [],
        }),
      ],
    ]);

    expect(buildOpenDomeSeries(nights)).toEqual([]);
  });

  it("builds a completed interval for a historical night", () => {
    const sunrise = ms("2026-07-11T06:00:00Z");

    const nights = new Map([
      [
        20260710,
        makeNight({
          sunsetMs: ms("2026-07-10T08:00:00Z"),
          sunriseMs: sunrise,
          intervals: [
            {
              open_time: "2026-07-10T09:00:00Z",
              close_time: "2026-07-10T11:00:00Z",
              open_hours: 2,
            },
          ],
        }),
      ],
    ]);

    expect(buildOpenDomeSeries(nights)).toEqual([
      [ms("2026-07-10T09:00:00Z"), 0],
      [ms("2026-07-10T11:00:00Z"), 2],
      [sunrise, 2],
      [sunrise, NaN],
    ]);
  });

  it("clips the first interval to sunset", () => {
    const sunset = ms("2026-07-10T08:00:00Z");

    const nights = new Map([
      [
        20260710,
        makeNight({
          sunsetMs: sunset,
          sunriseMs: ms("2026-07-11T06:00:00Z"),
          intervals: [
            {
              open_time: "2026-07-10T07:00:00Z",
              close_time: "2026-07-10T09:00:00Z",
              open_hours: 2,
            },
          ],
        }),
      ],
    ]);

    expect(buildOpenDomeSeries(nights)[0]).toEqual([sunset, 0]);
  });

  it("clips the final interval to sunrise", () => {
    const sunrise = ms("2026-07-11T06:00:00Z");

    const nights = new Map([
      [
        20260710,
        makeNight({
          sunsetMs: ms("2026-07-10T08:00:00Z"),
          sunriseMs: sunrise,
          intervals: [
            {
              open_time: "2026-07-11T05:00:00Z",
              close_time: "2026-07-11T08:00:00Z",
              open_hours: 3,
            },
          ],
        }),
      ],
    ]);

    const series = buildOpenDomeSeries(nights);

    expect(series[1]).toEqual([sunrise, 3]);
    expect(series[2]).toEqual([sunrise, 3]);
    expect(series[3]).toEqual([sunrise, NaN]);
  });

  it("accumulates multiple intervals", () => {
    const sunrise = ms("2026-07-11T06:00:00Z");

    const nights = new Map([
      [
        20260710,
        makeNight({
          sunsetMs: ms("2026-07-10T08:00:00Z"),
          sunriseMs: sunrise,
          intervals: [
            {
              open_time: "2026-07-10T09:00:00Z",
              close_time: "2026-07-10T10:00:00Z",
              open_hours: 1,
            },
            {
              open_time: "2026-07-10T12:00:00Z",
              close_time: "2026-07-10T14:00:00Z",
              open_hours: 2,
            },
          ],
        }),
      ],
    ]);

    expect(buildOpenDomeSeries(nights)).toEqual([
      [ms("2026-07-10T09:00:00Z"), 0],
      [ms("2026-07-10T10:00:00Z"), 1],
      [ms("2026-07-10T12:00:00Z"), 1],
      [ms("2026-07-10T14:00:00Z"), 3],
      [sunrise, 3],
      [sunrise, NaN],
    ]);
  });

  it("extends an ongoing open interval to the current time", () => {
    const now = ms("2026-07-15T12:00:00Z");

    const nights = new Map([
      [
        20260715,
        makeNight({
          sunsetMs: ms("2026-07-15T08:00:00Z"),
          sunriseMs: ms("2026-07-16T06:00:00Z"),
          intervals: [
            {
              open_time: "2026-07-15T09:00:00Z",
              close_time: null,
              open_hours: 3,
            },
          ],
        }),
      ],
    ]);

    expect(buildOpenDomeSeries(nights)).toEqual([
      [ms("2026-07-15T09:00:00Z"), 0],
      [now, 3],
    ]);
  });

  it("extends a completed current-night interval to the current time", () => {
    const now = ms("2026-07-15T12:00:00Z");

    const nights = new Map([
      [
        20260715,
        makeNight({
          sunsetMs: ms("2026-07-15T08:00:00Z"),
          sunriseMs: ms("2026-07-16T06:00:00Z"),
          intervals: [
            {
              open_time: "2026-07-15T09:00:00Z",
              close_time: "2026-07-15T10:00:00Z",
              open_hours: 1,
            },
          ],
        }),
      ],
    ]);

    expect(buildOpenDomeSeries(nights)).toEqual([
      [ms("2026-07-15T09:00:00Z"), 0],
      [ms("2026-07-15T10:00:00Z"), 1],
      [now, 1],
      [now, NaN],
    ]);
  });

  it("creates one NaN break for each completed night", () => {
    const nights = new Map([
      [
        20260710,
        makeNight({
          sunsetMs: ms("2026-07-10T08:00:00Z"),
          sunriseMs: ms("2026-07-11T06:00:00Z"),
          intervals: [
            {
              open_time: "2026-07-10T09:00:00Z",
              close_time: "2026-07-10T10:00:00Z",
              open_hours: 1,
            },
          ],
        }),
      ],
      [
        20260711,
        makeNight({
          sunsetMs: ms("2026-07-11T08:00:00Z"),
          sunriseMs: ms("2026-07-12T06:00:00Z"),
          intervals: [
            {
              open_time: "2026-07-11T09:00:00Z",
              close_time: "2026-07-11T10:00:00Z",
              open_hours: 2,
            },
          ],
        }),
      ],
    ]);

    const series = buildOpenDomeSeries(nights);

    expect(series.filter(([, y]) => Number.isNaN(y))).toHaveLength(2);
  });
});

describe("buildNightHoursSeries", () => {
  it("returns an empty array for no nights", () => {
    expect(buildNightHoursSeries(new Map())).toEqual([]);
  });

  it("creates a series with NaN separators", () => {
    const nights = new Map([
      [
        1,
        makeNight({
          sunsetMs: 100,
          sunriseMs: 200,
          nightHours: 9.5,
        }),
      ],
      [
        2,
        makeNight({
          sunsetMs: 300,
          sunriseMs: 400,
          nightHours: 10.25,
        }),
      ],
    ]);

    expect(buildNightHoursSeries(nights)).toEqual([
      [100, 9.5],
      [200, 9.5],
      [200, NaN],
      [300, 10.25],
      [400, 10.25],
      [400, NaN],
    ]);
  });

  it("contains one NaN break per night", () => {
    const nights = new Map([
      [1, makeNight()],
      [2, makeNight({ dayObs: 2 })],
      [3, makeNight({ dayObs: 3 })],
    ]);

    const series = buildNightHoursSeries(nights);

    expect(series.filter(([, y]) => Number.isNaN(y))).toHaveLength(3);
  });
});

describe("buildCumulativeStateSeries", () => {
  function makeInterval({
    start = 1100,
    end = 1200,
    start_state = STATE,
    end_state = STATE,
    start_labels = ["OPERATIONAL"],
    end_labels = ["OPERATIONAL"],
    start_note = null,
    end_note = null,
  } = {}) {
    return {
      start_time_ms: start,
      end_time_ms: end,
      start_state: start_state,
      end_state: end_state,
      start_labels: start_labels,
      end_labels: end_labels,
      start_note: start_note,
      end_note: end_note,
    };
  }

  const makeNights = () =>
    new Map([
      [
        20260701,
        makeNight({
          dayObs: 20260701,
          sunsetMs: 1000,
          sunriseMs: 2000,
        }),
      ],
    ]);

  const stateNames = Object.keys(OBSERVATORY_STATES).filter(
    (state) => state !== "DAYTIME",
  );
  const emptySeries = Object.fromEntries(
    stateNames.map((state) => [state, []]),
  );

  beforeEach(() => {
    vi.spyOn(timeUtils, "getCurrentDayObs").mockReturnValue(20260715);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Empty inputs are handled correctly
  it("returns an empty object when intervals is empty", () => {
    expect(buildCumulativeStateSeries([], makeNights())).toEqual({});
  });

  it("returns a object containing empty series when nights is empty", () => {
    expect(buildCumulativeStateSeries([makeInterval()], new Map())).toEqual(
      emptySeries,
    );
  });

  // start/end of night handling
  it("starts each state series at sunset with zero cumulative value", () => {
    const series = buildCumulativeStateSeries([makeInterval()], makeNights());

    for (const [, values] of Object.entries(series)) {
      expect(values[0]).toEqual({
        value: [1000, 0],
        showMarker: false,
      });
    }
  });

  it("ignores intervals that do not overlap the night", () => {
    const intervals = [
      makeInterval({ start: 0, end: 900 }),
      makeInterval({ start: 2000, end: 2200 }),
    ];

    const series = buildCumulativeStateSeries(intervals, makeNights());

    expect(series.OPERATIONAL).toEqual([
      { value: [1000, 0], showMarker: false },
      { value: [2000, 0], showMarker: false },
      { value: [2000, NaN], showMarker: false },
    ]);
  });

  it("clips an interval that starts before sunset", () => {
    const series = buildCumulativeStateSeries(
      [
        makeInterval({
          start: 900,
          end: 1200,
        }),
      ],
      makeNights(),
    );

    expect(series.OPERATIONAL).toContainEqual(
      expect.objectContaining({
        value: [1000, 0],
        clippedAtSunset: true,
      }),
    );

    expect(series.OPERATIONAL).toContainEqual({
      value: [1200, (1200 - 1000) / (1000 * 60 * 60)],
      showMarker: false,
    });
  });

  it("clips an interval that ends after sunrise", () => {
    const series = buildCumulativeStateSeries(
      [
        makeInterval({
          start: 1800,
          end: 2100,
        }),
      ],
      makeNights(),
    );

    expect(series.OPERATIONAL).toContainEqual({
      value: [2000, (2000 - 1800) / (1000 * 60 * 60)],
      showMarker: false,
    });
  });

  it("accumulates duration for an active state", () => {
    const interval = makeInterval({
      start: 1100,
      end: 1700,
    });

    const series = buildCumulativeStateSeries([interval], makeNights());

    const durationHours = (1700 - 1100) / (1000 * 60 * 60);

    expect(series.OPERATIONAL).toContainEqual({
      value: [1700, durationHours],
      showMarker: false,
    });
  });

  it("does not accumulate duration for an inactive state", () => {
    const interval = makeInterval({
      start: 1100,
      end: 1700,
      start_state: OBSERVATORY_STATES.FAULT,
      start_labels: ["FAULT"],
    });

    const series = buildCumulativeStateSeries([interval], makeNights());

    expect(series.OPERATIONAL).toEqual([
      { value: [1000, 0], showMarker: false },
      { value: [2000, 0], showMarker: false },
      { value: [2000, NaN], showMarker: false },
    ]);
  });

  it("handles UNKNOWN state when start_state is zero", () => {
    const interval = makeInterval({
      start: 1100,
      end: 1700,
      start_state: 0,
      labels: ["UNKNOWN"],
    });

    const series = buildCumulativeStateSeries([interval], makeNights());

    expect(series.UNKNOWN).toContainEqual(
      expect.objectContaining({
        value: [1100, 0],
        showMarker: true,
      }),
    );

    expect(series.UNKNOWN).toContainEqual({
      value: [1700, (1700 - 1100) / (1000 * 60 * 60)],
      showMarker: false,
    });
  });

  it("does not mark UNKNOWN active for non-zero start_state", () => {
    const interval = makeInterval({
      start: 1100,
      end: 1700,
    });

    const series = buildCumulativeStateSeries([interval], makeNights());

    expect(series.UNKNOWN).toEqual([
      { value: [1000, 0], showMarker: false },
      { value: [2000, 0], showMarker: false },
      { value: [2000, NaN], showMarker: false },
    ]);
  });

  it("handles bitmask states that share the same interval", () => {
    const status = OBSERVATORY_STATES.OPERATIONAL | OBSERVATORY_STATES.WEATHER;

    const interval = makeInterval({
      start: 1100,
      end: 1700,
      start_state: status,
      start_labels: ["OPERATIONAL", "WEATHER"],
    });

    const series = buildCumulativeStateSeries([interval], makeNights());

    const durationHours = (1700 - 1100) / (1000 * 60 * 60);

    expect(series.OPERATIONAL).toContainEqual({
      value: [1700, durationHours],
      showMarker: false,
    });

    expect(series.WEATHER).toContainEqual({
      value: [1700, durationHours],
      showMarker: false,
    });
  });

  it("adds a marker when a state becomes active", () => {
    const interval = makeInterval({
      start: 1100,
      end: 1700,
    });

    const series = buildCumulativeStateSeries([interval], makeNights());

    expect(series.OPERATIONAL).toContainEqual({
      value: [1100, 0],
      showMarker: true,
      status: ["OPERATIONAL"],
      time_ms: 1100,
      duration: 600,
      hasNote: false,
      note: null,
      clippedAtSunset: false,
    });
  });

  it("does not add a marker for a state that remains active", () => {
    const intervals = [
      makeInterval({
        start: 1100,
        end: 1300,
      }),
      makeInterval({
        start: 1300,
        end: 1500,
      }),
    ];

    const series = buildCumulativeStateSeries(intervals, makeNights());

    const activationMarkers = series.OPERATIONAL.filter(
      (point) => point.showMarker && point.value[0] === 1100,
    );

    expect(activationMarkers).toHaveLength(1);

    expect(
      series.OPERATIONAL.find(
        (point) => point.showMarker && point.value[0] === 1300,
      ),
    ).toBeUndefined();
  });

  it("adds a marker when an active state receives a new note", () => {
    const note = "Weather improving";
    const intervals = [
      makeInterval({
        start: 1100,
        end: 1300,
      }),
      makeInterval({
        start: 1300,
        end: 1500,
        start_note: note,
      }),
    ];

    const series = buildCumulativeStateSeries(intervals, makeNights());

    expect(series.OPERATIONAL).toContainEqual({
      value: [1300, (1300 - 1100) / (1000 * 60 * 60)],
      showMarker: true,
      status: ["OPERATIONAL"],
      time_ms: 1300,
      duration: 200,
      hasNote: true,
      note: note,
      clippedAtSunset: false,
    });
  });

  it("correctly registers an inactive interval between active intervals", () => {
    const intervals = [
      makeInterval({
        start: 1100,
        end: 1200,
      }),
      makeInterval({
        start: 1200,
        end: 1300,
        start_state: OBSERVATORY_STATES.FAULT,
        start_labels: ["FAULT"],
      }),
      makeInterval({
        start: 1300,
        end: 1400,
      }),
    ];

    const series = buildCumulativeStateSeries(intervals, makeNights());

    const activationMarkers = series.OPERATIONAL.filter(
      (point) =>
        point.showMarker &&
        (point.value[0] === 1100 || point.value[0] === 1300),
    );

    expect(activationMarkers).toHaveLength(2);
  });

  it("adds sunrise extension and break for completed nights", () => {
    const interval = makeInterval({
      start: 1100,
      end: 1500,
    });

    const series = buildCumulativeStateSeries([interval], makeNights());

    const expected_hours = (1500 - 1100) / (1000 * 60 * 60);

    expect(series.OPERATIONAL.slice(-2)).toEqual([
      {
        value: [2000, expected_hours],
        showMarker: false,
      },
      {
        value: [2000, NaN],
        showMarker: false,
      },
    ]);
  });

  it("adds NaN break points at the end of each night", () => {
    const nights = new Map([
      [
        20260701,
        makeNight({
          dayObs: 20260701,
          sunsetMs: 1000,
          sunriseMs: 2000,
        }),
      ],
      [
        20260702,
        makeNight({
          dayObs: 20260702,
          sunsetMs: 3000,
          sunriseMs: 4000,
        }),
      ],
    ]);

    const interval = makeInterval({
      start: 1100,
      end: 1500,
    });

    const series = buildCumulativeStateSeries([interval], nights);

    const breakPoints = series.OPERATIONAL.filter((point) =>
      Number.isNaN(point.value[1]),
    );

    expect(breakPoints).toHaveLength(2);
    expect(breakPoints[0].value[0]).toBe(2000);
    expect(breakPoints[1].value[0]).toBe(4000);
  });

  describe("current night handling", () => {
    it("returns completed series when an event recorded after sunrise", () => {
      vi.setSystemTime(new Date("2026-07-16T11:00:00Z"));

      const sunriseMs = ms("2026-07-16T08:00:00Z");

      const nights = new Map([
        [
          20260715,
          makeNight({
            dayObs: 20260715,
            sunsetMs: ms("2026-07-15T20:00:00Z"),
            sunriseMs: sunriseMs,
          }),
        ],
      ]);

      const intervals = [
        makeInterval({
          start: ms("2026-07-16T06:00:00Z"),
          end: ms("2026-07-16T09:00:00Z"),
        }),
      ];

      const series = buildCumulativeStateSeries(intervals, nights);

      expect(series.OPERATIONAL.at(-1).value[0]).toBe(sunriseMs);
      expect(Number.isNaN(series.OPERATIONAL.at(-1).value[1])).toBe(false);
    });

    it("adds sunset marker when the current active state began before sunset", () => {
      vi.setSystemTime(new Date("2026-07-15T23:00:00Z"));

      const sunsetMs = ms("2026-07-15T20:00:00Z");

      const nights = new Map([
        [
          20260715,
          makeNight({
            dayObs: 20260715,
            sunsetMs: sunsetMs,
            sunriseMs: ms("2026-07-16T08:00:00Z"),
          }),
        ],
      ]);

      const intervals = [
        makeInterval({
          start: ms("2026-07-15T18:00:00Z"),
          end: ms("2026-07-15T19:00:00Z"),
        }),
      ];

      const series = buildCumulativeStateSeries(intervals, nights);

      expect(series.OPERATIONAL).toContainEqual(
        expect.objectContaining({
          value: [sunsetMs, 0],
          clippedAtSunset: true,
          showMarker: true,
        }),
      );
    });

    it("does not add sunset marker for inactive state when current active state began before sunset", () => {
      vi.setSystemTime(new Date("2026-07-15T23:00:00Z"));

      const sunsetMs = ms("2026-07-15T20:00:00Z");

      const nights = new Map([
        [
          20260715,
          makeNight({
            dayObs: 20260715,
            sunsetMs: sunsetMs,
            sunriseMs: ms("2026-07-16T08:00:00Z"),
          }),
        ],
      ]);

      const intervals = [
        makeInterval({
          start: ms("2026-07-15T18:00:00Z"),
          end: ms("2026-07-15T19:00:00Z"),
        }),
      ];

      const series = buildCumulativeStateSeries(intervals, nights);

      expect(
        series.FAULT.find(
          (point) => point.showMarker && point.value[0] === sunsetMs,
        ),
      ).toBeUndefined();
    });

    it("adds current active state marker at the last event time", () => {
      vi.setSystemTime(new Date("2026-07-16T05:00:00Z"));

      const nights = new Map([
        [
          20260715,
          makeNight({
            dayObs: 20260715,
            sunsetMs: ms("2026-07-15T20:00:00Z"),
            sunriseMs: ms("2026-07-16T08:00:00Z"),
          }),
        ],
      ]);

      const endTime = ms("2026-07-16T04:00:00Z");

      const interval = makeInterval({
        start: ms("2026-07-16T03:00:00Z"),
        end: endTime,
      });

      const series = buildCumulativeStateSeries([interval], nights);

      expect(series.OPERATIONAL).toContainEqual(
        expect.objectContaining({
          value: [endTime, 1],
          showMarker: true,
        }),
      );
    });

    it("extends final active state to sunrise if current time is after sunrise", () => {
      vi.setSystemTime(ms("2026-07-16T11:00:00Z"));

      const sunrise = ms("2026-07-16T08:00:00Z");

      const nights = new Map([
        [
          20260715,
          makeNight({
            dayObs: 20260715,
            sunsetMs: ms("2026-07-15T20:00:00Z"),
            sunriseMs: sunrise,
          }),
        ],
      ]);

      const interval = makeInterval({
        start: ms("2026-07-15T21:00:00Z"),
        end: ms("2026-07-15T22:00:00Z"),
      });

      const series = buildCumulativeStateSeries([interval], nights);

      expect(series.OPERATIONAL.at(-2).value[0]).toBe(sunrise);
    });

    it("extends final active state to the current time if before sunrise", () => {
      const now = ms("2026-07-15T23:00:00Z");
      vi.setSystemTime(now);

      const sunset = ms("2026-07-15T20:00:00Z");
      const sunrise = ms("2026-07-16T08:00:00Z");

      const nights = new Map([
        [
          20260715,
          makeNight({
            dayObs: 20260715,
            sunsetMs: sunset,
            sunriseMs: sunrise,
          }),
        ],
      ]);

      const interval = makeInterval({
        start: ms("2026-07-15T21:00:00Z"),
        end: ms("2026-07-15T22:00:00Z"),
      });

      const intervalHours =
        (interval.end_time_ms - interval.start_time_ms) / (1000 * 60 * 60);

      const extraHours = (now - interval.end_time_ms) / (1000 * 60 * 60);

      const series = buildCumulativeStateSeries([interval], nights);

      expect(series.OPERATIONAL.at(-2)).toEqual({
        value: [now, intervalHours + extraHours],
        showMarker: false,
      });
    });

    it("does not extend inactive states with additional hours", () => {
      const now = ms("2026-07-15T23:00:00Z");
      vi.setSystemTime(now);

      const nights = new Map([
        [
          20260715,
          makeNight({
            dayObs: 20260715,
            sunsetMs: ms("2026-07-15T20:00:00Z"),
            sunriseMs: ms("2026-07-16T08:00:00Z"),
          }),
        ],
      ]);

      const interval = {
        ...makeInterval({
          start: ms("2026-07-15T21:00:00Z"),
          end: ms("2026-07-15T22:00:00Z"),
        }),
      };

      const series = buildCumulativeStateSeries([interval], nights);

      expect(series.FAULT.at(-2)).toEqual({
        value: [now, 0],
        showMarker: false,
      });
    });
  });

  describe("edge cases", () => {
    it("handles an interval clipped entirely outside the night", () => {
      const sunset = 1000;
      const sunrise = 2000;

      const nights = new Map([
        [
          20260701,
          makeNight({
            dayObs: 20260701,
            sunsetMs: sunset,
            sunriseMs: sunrise,
          }),
        ],
      ]);

      const interval = makeInterval({
        start: 2100,
        end: 2200,
      });

      const series = buildCumulativeStateSeries([interval], nights);

      expect(series.OPERATIONAL).toEqual([
        { value: [sunset, 0], showMarker: false },
        { value: [sunrise, 0], showMarker: false },
        { value: [sunrise, NaN], showMarker: false },
      ]);
    });

    it("handles zero-duration intervals", () => {
      const sunset = 1000;
      const sunrise = 2000;

      const nights = new Map([
        [
          20260701,
          makeNight({
            dayObs: 20260701,
            sunsetMs: sunset,
            sunriseMs: sunrise,
          }),
        ],
      ]);

      const interval = makeInterval({
        start: 1500,
        end: 1500,
      });

      const series = buildCumulativeStateSeries([interval], nights);

      expect(series.OPERATIONAL).toEqual([
        { value: [sunset, 0], showMarker: false },
        { value: [sunrise, 0], showMarker: false },
        { value: [sunrise, NaN], showMarker: false },
      ]);
    });

    it("handles notes containing empty or falsy values", () => {
      const nights = new Map([
        [
          20260701,
          makeNight({
            dayObs: 20260701,
            sunsetMs: 1000,
            sunriseMs: 3000,
          }),
        ],
      ]);

      const intervals = [
        makeInterval({
          start: 1100,
          end: 1300,
        }),
        makeInterval({
          start: 1300,
          end: 1500,
          start_note: "",
        }),
      ];

      const series = buildCumulativeStateSeries(intervals, nights);

      const markersAt1300 = series.OPERATIONAL.filter(
        (point) => point.value[0] === 1300,
      );

      expect(markersAt1300[0].showMarker).toEqual(false);
    });

    it("handles multiple nights in chronological order", () => {
      const sunset1 = 1000;
      const sunrise1 = 2000;
      const sunset2 = 4000;
      const sunrise2 = 5000;

      const nights = new Map([
        [
          20260701,
          makeNight({
            dayObs: 20260701,
            sunsetMs: sunset1,
            sunriseMs: sunrise1,
          }),
        ],
        [
          20260702,
          makeNight({
            dayObs: 20260702,
            sunsetMs: sunset2,
            sunriseMs: sunrise2,
          }),
        ],
      ]);

      const interval = makeInterval({
        start: 1100,
        end: 1500,
      });

      const series = buildCumulativeStateSeries([interval], nights);

      // Second night should have its own sunset/sunrise/point break markers
      const secondNightMarkers = series.OPERATIONAL.filter(
        (point) => point.value[0] > sunrise1,
      );

      expect(secondNightMarkers).toHaveLength(3);
      expect(secondNightMarkers).toEqual([
        { value: [sunset2, 0], showMarker: false },
        { value: [sunrise2, 0], showMarker: false },
        { value: [sunrise2, NaN], showMarker: false },
      ]);
    });

    it("handles an interval where only active state is UNKNOWN", () => {
      const nights = new Map([
        [
          20260701,
          makeNight({
            dayObs: 20260701,
            sunsetMs: 1000,
            sunriseMs: 2000,
          }),
        ],
      ]);

      const interval = makeInterval({
        start: 1100,
        end: 1500,
        start_state: 0,
        end_state: 0,
        start_labels: [],
        end_labels: [],
      });

      const series = buildCumulativeStateSeries([interval], nights);

      // All states except UNKNOWN should have zero cumulative hours
      const knownStates = Object.keys(series).filter(
        (state) => state !== "UNKNOWN",
      );

      for (const state of knownStates) {
        const lastPoint = series[state].at(-2);
        expect(lastPoint.value[1]).toBe(0);
      }

      // UNKNOWN should have accumulated hours
      const unknownLastPoint = series.UNKNOWN.at(-2);
      expect(unknownLastPoint.value[1]).toBe((1500 - 1100) / (1000 * 60 * 60));
    });
  });
});

describe("buildNightMetadataMap", () => {
  it("returns an empty map when given no almanac data", () => {
    expect(buildNightMetadataMap([])).toEqual(new Map());
  });

  it("corrects the almanac dayobs by subtracting one day", () => {
    const almanac = [
      {
        dayobs: 20260702,
        twilight_evening_12deg: "2026-07-01 08:00:00",
        twilight_morning_12deg: "2026-07-02 06:00:00",
        night_hours: 10,
      },
    ];

    const nights = buildNightMetadataMap(almanac);

    expect(nights.has(20260701)).toBe(true);

    expect(nights.get(20260701)).toMatchObject({
      dayObs: 20260701,
      nightHours: 10,
      intervals: [],
    });
  });

  it("attaches matching dome intervals", () => {
    const almanac = [
      {
        dayobs: 20260702,
        twilight_evening_12deg: "2026-07-01 08:00:00",
        twilight_morning_12deg: "2026-07-02 06:00:00",
        night_hours: 10,
      },
    ];

    const interval = {
      day_obs: 20260701,
      open_time: "2026-07-01T09:00:00Z",
      close_time: "2026-07-01T10:00:00Z",
      open_hours: 1,
    };

    const nights = buildNightMetadataMap(almanac, [interval]);

    expect(nights.get(20260701).intervals).toEqual([interval]);
  });

  it("ignores intervals whose dayobs is outside the queried range", () => {
    const almanac = [
      {
        dayobs: 20260702,
        twilight_evening_12deg: "2026-07-01 08:00:00",
        twilight_morning_12deg: "2026-07-02 06:00:00",
        night_hours: 10,
      },
    ];

    const interval = {
      day_obs: 19990101,
      open_time: "2026-07-01T09:00:00Z",
      close_time: "2026-07-01T10:00:00Z",
      open_hours: 1,
    };

    const nights = buildNightMetadataMap(almanac, [interval]);

    expect(nights.get(20260701).intervals).toEqual([]);
  });

  it("ignores intervals without an open_time", () => {
    const almanac = [
      {
        dayobs: 20260702,
        twilight_evening_12deg: "2026-07-01 08:00:00",
        twilight_morning_12deg: "2026-07-02 06:00:00",
        night_hours: 10,
      },
    ];

    const interval = {
      day_obs: 20260701,
      open_time: null,
      close_time: null,
      open_hours: 0,
    };

    const nights = buildNightMetadataMap(almanac, [interval]);

    expect(nights.get(20260701).intervals).toEqual([]);
  });

  it("creates timestamps from the almanac values", () => {
    const almanac = [
      {
        dayobs: 20260702,
        twilight_evening_12deg: "2026-07-01 08:00:00",
        twilight_morning_12deg: "2026-07-02 06:00:00",
        night_hours: 10,
      },
    ];

    const nights = buildNightMetadataMap(almanac);

    const night = nights.get(20260701);

    expect(night.sunsetMs).toBe(ms("2026-07-01T08:00:00Z"));
    expect(night.sunriseMs).toBe(ms("2026-07-02T06:00:00Z"));
  });
});

describe("buildCumulativePlotModel", () => {
  const DAYOBS = 20260702;
  const TWILIGHT_EVENING = "2026-07-01 08:00:00";
  const TWILIGHT_MORNING = "2026-07-02 06:00:00";
  const OPEN_TIME = "2026-07-01T09:00:00Z";
  const CLOSE_TIME = "2026-07-01T10:00:00Z";

  const almanac = [
    {
      dayobs: DAYOBS,
      twilight_evening_12deg: TWILIGHT_EVENING,
      twilight_morning_12deg: TWILIGHT_MORNING,
      night_hours: 10,
    },
  ];

  const domeIntervals = [
    {
      day_obs: DAYOBS - 1,
      open_time: OPEN_TIME,
      close_time: CLOSE_TIME,
      open_hours: 1,
    },
  ];

  const interval = {
    start_time_ms: ms(OPEN_TIME),
    end_time_ms: ms(CLOSE_TIME),
    start_state: STATE,
    end_state: STATE,
    start_labels: ["OPERATIONAL"],
    end_labels: ["OPERATIONAL"],
    start_note: null,
    end_note: null,
  };

  it("returns an empty object when no almanac data is provided", () => {
    expect(buildCumulativePlotModel([], [], [])).toEqual({});
    expect(buildCumulativePlotModel(null, [], [])).toEqual({});
  });

  it("returns a model containing all expected sections", () => {
    const model = buildCumulativePlotModel(almanac, [], []);

    expect(Object.keys(model).sort()).toEqual(
      ["breaks", "nightHours", "openDomeSeries", "stateSeries"].sort(),
    );
  });

  it("assembles a complete model for a single night", () => {
    const model = buildCumulativePlotModel(almanac, [interval], domeIntervals);

    expect(model.breaks).toEqual(expect.any(Array));
    expect(model.nightHours).toEqual(expect.any(Array));
    expect(model.openDomeSeries).toEqual(expect.any(Array));
    expect(model.stateSeries).toEqual(expect.any(Object));

    expect(model.stateSeries).toHaveProperty("OPERATIONAL");
    expect(model.stateSeries.OPERATIONAL.length).toBeGreaterThan(0);
  });
});
