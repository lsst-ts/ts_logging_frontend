import { describe, expect, it } from "vitest";

import { OBSERVATORY_STATES } from "@/constants/OBSERVATORY_STATUS_DEFINITIONS";
import { almanacDayobsForPlot } from "@/utils/timeUtils";
import { statusBitmaskToString } from "@/utils/observatoryStatusUtils";

import {
  INVALID_STATE_PAIRS,
  buildNightDefinitions,
  buildObservatoryStatusBreakdown,
  calculateExactStatusDurations,
  generateValidCombinations,
  getCombinationsForState,
  isValidNighttimeStatus,
} from "@/utils/obsStatusBreakdownUtils";

describe("almanacDayobsForPlot", () => {
  it("applies the temporary almanac dayobs workaround", () => {
    expect(almanacDayobsForPlot(20260422)).toBe("20260421");
    expect(almanacDayobsForPlot("20260401")).toBe("20260331");
  });

  it("returns Invalid DateTime for an invalid dayobs", () => {
    expect(almanacDayobsForPlot("not-a-day")).toBe("Invalid DateTime");
  });
});

describe("buildNightDefinitions", () => {
  it("builds UTC observing-night boundaries and corrected dayobs", () => {
    const nights = buildNightDefinitions([
      {
        dayobs: 20260422,
        elapsed_twilight_hours: 11.0783,
        twilight_evening_12deg: "2026-04-21 23:09:22",
        twilight_morning_12deg: "2026-04-22 10:14:04",
      },
    ]);

    expect(nights).toHaveLength(1);

    expect(nights[0].dayObs).toBe("20260421");
    expect(nights[0].nightHours).toBe(11.0783);

    expect(nights[0].startMs).toBe(Date.parse("2026-04-21T23:09:22Z"));

    expect(nights[0].endMs).toBe(Date.parse("2026-04-22T10:14:04Z"));
  });
});

describe("nighttime status rules", () => {
  it("allows UNKNOWN by itself", () => {
    expect(isValidNighttimeStatus(OBSERVATORY_STATES.UNKNOWN)).toBe(true);
  });

  it("rejects DAYTIME completely", () => {
    expect(isValidNighttimeStatus(OBSERVATORY_STATES.DAYTIME)).toBe(false);

    expect(
      isValidNighttimeStatus(
        OBSERVATORY_STATES.DAYTIME | OBSERVATORY_STATES.FAULT,
      ),
    ).toBe(false);
  });

  it("rejects configured invalid combinations", () => {
    for (const [first, second] of INVALID_STATE_PAIRS) {
      expect(isValidNighttimeStatus(first | second)).toBe(false);
    }
  });

  it("allows valid combinations", () => {
    expect(
      isValidNighttimeStatus(
        OBSERVATORY_STATES.FAULT | OBSERVATORY_STATES.WEATHER,
      ),
    ).toBe(true);

    expect(
      isValidNighttimeStatus(
        OBSERVATORY_STATES.WEATHER |
          OBSERVATORY_STATES.DOWNTIME |
          OBSERVATORY_STATES.IDLE,
      ),
    ).toBe(true);

    expect(
      isValidNighttimeStatus(
        OBSERVATORY_STATES.OPERATIONAL | OBSERVATORY_STATES.WEATHER,
      ),
    ).toBe(true);
  });
});

describe("generateValidCombinations", () => {
  it("generates all valid combinations, including combinations that may have zero duration", () => {
    const combinations = generateValidCombinations();

    // Five nighttime states with the current three restrictions
    // produce 17 valid non-zero combinations.
    expect(combinations).toHaveLength(17);
  });

  it("does not include UNKNOWN", () => {
    const combinations = generateValidCombinations();

    expect(
      combinations.some(
        (combination) => combination.mask === OBSERVATORY_STATES.UNKNOWN,
      ),
    ).toBe(false);
  });

  it("does not include DAYTIME", () => {
    const combinations = generateValidCombinations();

    expect(
      combinations.every(
        (combination) => (combination.mask & OBSERVATORY_STATES.DAYTIME) === 0,
      ),
    ).toBe(true);
  });

  it("includes Operational + Weather", () => {
    const combinations = generateValidCombinations();

    expect(
      combinations.some(
        (combination) =>
          combination.mask ===
          (OBSERVATORY_STATES.OPERATIONAL | OBSERVATORY_STATES.WEATHER),
      ),
    ).toBe(true);
  });

  it("does not include Operational + Fault", () => {
    const combinations = generateValidCombinations();

    expect(
      combinations.some(
        (combination) =>
          combination.mask ===
          (OBSERVATORY_STATES.OPERATIONAL | OBSERVATORY_STATES.FAULT),
      ),
    ).toBe(false);
  });
});

describe("breakdown combination labels via statusBitmaskToString", () => {
  it("labels a single state", () => {
    expect(statusBitmaskToString(OBSERVATORY_STATES.FAULT, " + ")).toBe(
      "Fault",
    );
  });

  it("labels combinations using full state names with + separator", () => {
    expect(
      statusBitmaskToString(
        OBSERVATORY_STATES.FAULT | OBSERVATORY_STATES.WEATHER,
        " + ",
      ),
    ).toBe("Fault + Weather");
  });

  it("labels UNKNOWN separately", () => {
    expect(statusBitmaskToString(OBSERVATORY_STATES.UNKNOWN, " + ")).toBe(
      "Unknown",
    );
  });
});

describe("getCombinationsForState", () => {
  it("includes every valid combination containing Fault", () => {
    const combinations = getCombinationsForState(OBSERVATORY_STATES.FAULT);

    expect(combinations).toHaveLength(8);

    expect(
      combinations.every(
        (combination) => combination.mask & OBSERVATORY_STATES.FAULT,
      ),
    ).toBe(true);
  });

  it("includes Operational + Weather under both parents", () => {
    const mask = OBSERVATORY_STATES.OPERATIONAL | OBSERVATORY_STATES.WEATHER;

    expect(
      getCombinationsForState(OBSERVATORY_STATES.OPERATIONAL).some(
        (combination) => combination.mask === mask,
      ),
    ).toBe(true);

    expect(
      getCombinationsForState(OBSERVATORY_STATES.WEATHER).some(
        (combination) => combination.mask === mask,
      ),
    ).toBe(true);
  });
});

describe("calculateExactStatusDurations", () => {
  const almanacInfo = [
    {
      dayobs: 20260422,
      elapsed_twilight_hours: 11.0783,
      twilight_evening_12deg: "2026-04-21 23:09:22",
      twilight_morning_12deg: "2026-04-22 10:14:04",
    },
  ];

  it("clips intervals to the nighttime boundaries", () => {
    const nightStart = Date.parse("2026-04-21T23:09:22Z");
    const nightEnd = Date.parse("2026-04-22T10:14:04Z");

    const intervals = [
      {
        // Starts before the night and ends after it.
        start_time_ms: nightStart - 60 * 60 * 1000,
        end_time_ms: nightEnd + 60 * 60 * 1000,
        start_state: OBSERVATORY_STATES.FAULT | OBSERVATORY_STATES.WEATHER,
      },
    ];

    const { exactDurations } = calculateExactStatusDurations({
      almanacInfo,
      obsStatusIntervals: intervals,
    });

    expect(
      exactDurations["20260421"][
        OBSERVATORY_STATES.FAULT | OBSERVATORY_STATES.WEATHER
      ],
    ).toBeCloseTo(11.0783333, 5);
  });

  it("uses start_state as the active state", () => {
    const start = Date.parse("2026-04-22T00:00:00Z");
    const end = Date.parse("2026-04-22T01:00:00Z");

    const { exactDurations } = calculateExactStatusDurations({
      almanacInfo,
      obsStatusIntervals: [
        {
          start_time_ms: start,
          end_time_ms: end,
          start_state: OBSERVATORY_STATES.FAULT,
          end_state: OBSERVATORY_STATES.WEATHER,
        },
      ],
    });

    expect(exactDurations["20260421"][OBSERVATORY_STATES.FAULT]).toBeCloseTo(
      1,
      8,
    );

    expect(
      exactDurations["20260421"][OBSERVATORY_STATES.WEATHER],
    ).toBeUndefined();
  });

  it("counts UNKNOWN intervals", () => {
    const start = Date.parse("2026-04-22T00:00:00Z");
    const end = Date.parse("2026-04-22T01:30:00Z");

    const { exactDurations } = calculateExactStatusDurations({
      almanacInfo,
      obsStatusIntervals: [
        {
          start_time_ms: start,
          end_time_ms: end,
          start_state: OBSERVATORY_STATES.UNKNOWN,
          end_state: OBSERVATORY_STATES.UNKNOWN,
        },
      ],
    });

    expect(exactDurations["20260421"][OBSERVATORY_STATES.UNKNOWN]).toBeCloseTo(
      1.5,
      8,
    );
  });

  it("completely ignores DAYTIME intervals", () => {
    const start = Date.parse("2026-04-22T00:00:00Z");
    const end = Date.parse("2026-04-22T01:00:00Z");

    const { exactDurations } = calculateExactStatusDurations({
      almanacInfo,
      obsStatusIntervals: [
        {
          start_time_ms: start,
          end_time_ms: end,
          start_state: OBSERVATORY_STATES.DAYTIME,
          end_state: OBSERVATORY_STATES.UNKNOWN,
        },
      ],
    });

    expect(exactDurations["20260421"]).toEqual({});
  });

  it("ignores invalid combinations", () => {
    const start = Date.parse("2026-04-22T00:00:00Z");
    const end = Date.parse("2026-04-22T01:00:00Z");

    const { exactDurations } = calculateExactStatusDurations({
      almanacInfo,
      obsStatusIntervals: [
        {
          start_time_ms: start,
          end_time_ms: end,
          start_state:
            OBSERVATORY_STATES.OPERATIONAL | OBSERVATORY_STATES.FAULT,
          end_state: OBSERVATORY_STATES.UNKNOWN,
        },
      ],
    });

    expect(exactDurations["20260421"]).toEqual({});
  });
});

describe("buildObservatoryStatusBreakdown", () => {
  const almanacInfo = [
    {
      dayobs: 20260422,
      elapsed_twilight_hours: 11,
      twilight_evening_12deg: "2026-04-21 23:00:00",
      twilight_morning_12deg: "2026-04-22 10:00:00",
    },
  ];

  const dayObsOpenDomeHours = {
    20260421: {
      open_hours: 10.5,
    },
  };

  it("creates the summary rows first", () => {
    const { rows } = buildObservatoryStatusBreakdown({
      almanacInfo,
      dayObsOpenDomeHours,
      obsStatusIntervals: [],
    });

    expect(rows[0].state).toBe("Night Hours");
    expect(rows[0].rowType).toBe("summary");

    expect(rows[1].state).toBe("Dome Open");
    expect(rows[1].rowType).toBe("summary");
  });

  it("uses elapsed_twilight_hours for Night Hours", () => {
    const { rows } = buildObservatoryStatusBreakdown({
      almanacInfo,
      dayObsOpenDomeHours,
      obsStatusIntervals: [],
    });

    expect(rows[0]["20260421"]).toBe(11);
    expect(rows[0].total).toBe(11);
  });

  it("uses open_hours for Dome Open", () => {
    const { rows } = buildObservatoryStatusBreakdown({
      almanacInfo,
      dayObsOpenDomeHours,
      obsStatusIntervals: [],
    });

    expect(rows[1]["20260421"]).toBe(10.5);
    expect(rows[1].total).toBe(10.5);
  });

  it("creates every possible combination even when duration is zero", () => {
    const { rows } = buildObservatoryStatusBreakdown({
      almanacInfo,
      dayObsOpenDomeHours,
      obsStatusIntervals: [],
    });

    const faultRow = rows.find((row) => row.state === "Fault");

    expect(faultRow).toBeDefined();

    // Fault has 8 valid combinations under the current rules.
    expect(faultRow.subRows).toHaveLength(8);

    // No intervals occurred, so every combination is still present
    // with zero duration.
    expect(faultRow.subRows.every((row) => row.total === 0)).toBe(true);
  });

  it("attributes a combination to every applicable parent", () => {
    const start = Date.parse("2026-04-22T00:00:00Z");
    const end = Date.parse("2026-04-22T01:00:00Z");

    const mask = OBSERVATORY_STATES.FAULT | OBSERVATORY_STATES.WEATHER;

    const { rows } = buildObservatoryStatusBreakdown({
      almanacInfo,
      dayObsOpenDomeHours,
      obsStatusIntervals: [
        {
          start_time_ms: start,
          end_time_ms: end,
          start_state: mask,
          end_state: OBSERVATORY_STATES.UNKNOWN,
        },
      ],
    });

    const faultRow = rows.find((row) => row.state === "Fault");

    const weatherRow = rows.find((row) => row.state === "Weather");

    const faultWeatherInFault = faultRow.subRows.find(
      (row) => row.state === "Fault + Weather",
    );

    const faultWeatherInWeather = weatherRow.subRows.find(
      (row) => row.state === "Fault + Weather",
    );

    expect(faultWeatherInFault.total).toBeCloseTo(1, 8);
    expect(faultWeatherInWeather.total).toBeCloseTo(1, 8);

    expect(faultRow.total).toBeCloseTo(1, 8);
    expect(weatherRow.total).toBeCloseTo(1, 8);
  });

  it("does not create combination children for Unknown", () => {
    const { rows } = buildObservatoryStatusBreakdown({
      almanacInfo,
      dayObsOpenDomeHours,
      obsStatusIntervals: [],
    });

    const unknownRow = rows.find((row) => row.state === "Unknown");

    expect(unknownRow.subRows).toBeUndefined();
  });

  it("keeps the selected-night columns dynamic", () => {
    const secondNight = {
      dayobs: 20260423,
      elapsed_twilight_hours: 10,
      twilight_evening_12deg: "2026-04-22 23:00:00",
      twilight_morning_12deg: "2026-04-23 09:00:00",
    };

    const { dayObsValues } = buildObservatoryStatusBreakdown({
      almanacInfo: [...almanacInfo, secondNight],
      dayObsOpenDomeHours,
      obsStatusIntervals: [],
    });

    expect(dayObsValues).toEqual(["20260421", "20260422"]);
  });
});
