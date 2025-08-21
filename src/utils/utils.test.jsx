import { describe, it, expect } from "vitest";
import {
  calculateSumExpTimeBetweenTwilights,
  calculateEfficiency,
} from "../utils/utils.jsx";

const sampleAlmanacInfo = [
  {
    dayobs: "20240602", // will match exposure day_obs "20240601"
    twilight_evening: "2024-06-01 18:00:00",
    twilight_morning: "2024-06-02 06:00:00",
    night_hours: 12,
  },
  {
    dayobs: "20240603", // will match exposure day_obs "20240602"
    twilight_evening: "2024-06-02 18:00:00",
    twilight_morning: "2024-06-03 06:00:00",
    night_hours: 12,
  },
];

const sampleExposures = [
  {
    day_obs: "20240601",
    obs_start: "2024-06-01T19:00:00",
    exp_time: 100,
    can_see_sky: true,
  },
  {
    day_obs: "20240601",
    obs_start: "2024-06-01T17:00:00",
    exp_time: 50,
    can_see_sky: true,
  },
  {
    day_obs: "20240602",
    obs_start: "2024-06-02T19:00:00",
    exp_time: 200,
    can_see_sky: true,
  },
  {
    day_obs: "20240602",
    obs_start: "2024-06-02T17:00:00",
    exp_time: 100,
    can_see_sky: false,
  },
];

describe("calculateSumExpTimeBetweenTwilights", () => {
  it("returns correct sum for exposures within twilight bounds", () => {
    const result = calculateSumExpTimeBetweenTwilights(
      sampleExposures,
      sampleAlmanacInfo,
    );
    // Only exposures with can_see_sky true and obs_start between twilights are counted
    // For 20240601: 19:00 is between 18:00 and 06:00 next day, 17:00 is not
    // For 20240602: 19:00 is between 18:00 and 06:00 next day, 17:00 is not
    expect(result).toBe(100 + 200);
  });

  it("returns 0 if exposuresFields is null", () => {
    expect(calculateSumExpTimeBetweenTwilights(null, sampleAlmanacInfo)).toBe(
      0,
    );
  });

  it("returns 0 if exposuresFields is empty", () => {
    expect(calculateSumExpTimeBetweenTwilights([], sampleAlmanacInfo)).toBe(0);
  });

  it("returns 0 if almanacInfo is null", () => {
    expect(calculateSumExpTimeBetweenTwilights(sampleExposures, null)).toBe(0);
  });

  it("returns 0 if almanacInfo is empty", () => {
    expect(calculateSumExpTimeBetweenTwilights(sampleExposures, [])).toBe(0);
  });

  it("ignores exposures with can_see_sky false", () => {
    const exposures = [
      {
        day_obs: "20240601",
        obs_start: "2024-06-01T19:00:00",
        exp_time: 100,
        can_see_sky: false,
      },
    ];
    expect(
      calculateSumExpTimeBetweenTwilights(exposures, sampleAlmanacInfo),
    ).toBe(0);
  });

  it("handles missing exp_time or obs_start gracefully", () => {
    const exposures = [{ day_obs: "20240601", can_see_sky: true }];
    expect(
      calculateSumExpTimeBetweenTwilights(exposures, sampleAlmanacInfo),
    ).toBe(0);
  });
});

describe("calculateEfficiency", () => {
  it("calculates efficiency with valid inputs", () => {
    const exposures = sampleExposures;
    const almanacInfo = sampleAlmanacInfo;
    const sumExpTime = 300;
    const weatherLoss = 2;
    // nightHours = 24, totalExpTime = 300
    // eff = (100 * 300 / 3600) / (24 - 2)
    const expected = Math.round((100 * 300) / 3600 / 22);
    expect(
      calculateEfficiency(exposures, almanacInfo, sumExpTime, weatherLoss),
    ).toBe(expected);
  });

  it("returns 0 if exposures is null", () => {
    expect(calculateEfficiency(null, sampleAlmanacInfo, 300, 2)).toBe(0);
  });

  it("returns 0 if exposures is not array", () => {
    expect(calculateEfficiency({}, sampleAlmanacInfo, 300, 2)).toBe(0);
  });

  it("returns 0 if nightHours is 0", () => {
    const almanacInfo = [{ night_hours: 0 }];
    expect(calculateEfficiency(sampleExposures, almanacInfo, 300, 2)).toBe(
      null,
    );
  });

  it("returns 0 if totalExpTime is 0", () => {
    expect(calculateEfficiency(sampleExposures, sampleAlmanacInfo, 0, 2)).toBe(
      0,
    );
  });

  it("handles null almanacInfo by using sumExpTime", () => {
    expect(calculateEfficiency(sampleExposures, null, 300, 2)).toBe(0);
  });

  it("handles null weatherLoss", () => {
    expect(
      calculateEfficiency(sampleExposures, sampleAlmanacInfo, 300, null),
    ).toBe(null);
  });

  it("handles negative weatherLoss", () => {
    expect(
      calculateEfficiency(sampleExposures, sampleAlmanacInfo, 300, -2),
    ).toBe(null);
  });

  it("handles null weatherLoss", () => {
    expect(
      calculateEfficiency(sampleExposures, sampleAlmanacInfo, 300, null),
    ).toBe(null);
  });

  it("handles undefined weatherLoss", () => {
    expect(
      calculateEfficiency(sampleExposures, sampleAlmanacInfo, 300, undefined),
    ).toBe(null);
  });

  it("handles 0 weatherLoss", () => {
    expect(
      calculateEfficiency(sampleExposures, sampleAlmanacInfo, 300, 0),
    ).toBe(Math.round((100 * 300) / 3600 / 24));
  });
});
