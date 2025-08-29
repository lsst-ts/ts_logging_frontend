import { describe, it, expect, beforeEach, vi } from "vitest";

import {
  calculateEfficiency,
  calculateSumExpTimeBetweenTwilights,
  calculateTimeLoss,
  getDayobsStr,
  getDatetimeFromDayobsStr,
  getDisplayDateRange,
  getKeyByValue,
  formatCellValue,
  mergeDataLogSources,
  getRubinTVUrl,
  buildNavItemUrl,
  getNightSummaryLink,
  prettyTitleFromKey,
  DEFAULT_PIXEL_SCALE_MEDIAN,
  PSF_SIGMA_FACTOR,
  DEFAULT_EXTERNAL_INSTANCE_URL,
} from "@/utils/utils";

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

describe("utils", () => {
  // describe("calculateEfficiency", () => {
  //   it("returns 0 if nightHours is 0", () => {
  //     expect(calculateEfficiency(0, 1000, 0)).toBe(0);
  //   });

  //   it("calculates rounded efficiency correctly", () => {
  //     // 2 hours available (7200s), 3600s exposure, no weather loss → 50%
  //     expect(calculateEfficiency(2, 3600, 0)).toBe(50);
  //   });

  //   it("accounts for weather loss", () => {
  //     // 2 hours available (7200s), 3600s exposure, 3600s lost → 100%
  //     expect(calculateEfficiency(2, 3600, 3600)).toBe(100);
  //   });
  // });

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
      expect(calculateSumExpTimeBetweenTwilights([], sampleAlmanacInfo)).toBe(
        0,
      );
    });

    it("returns 0 if almanacInfo is null", () => {
      expect(calculateSumExpTimeBetweenTwilights(sampleExposures, null)).toBe(
        0,
      );
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
      expect(calculateEfficiency(null, sampleAlmanacInfo, 300, 2)).toBe(null);
    });

    it("returns 0 if exposures is not array", () => {
      expect(calculateEfficiency({}, sampleAlmanacInfo, 300, 2)).toBe(null);
    });

    it("returns 0 if nightHours is 0", () => {
      const almanacInfo = [{ night_hours: 0 }];
      expect(calculateEfficiency(sampleExposures, almanacInfo, 300, 2)).toBe(
        null,
      );
    });

    it("returns 0 if totalExpTime is 0", () => {
      expect(
        calculateEfficiency(sampleExposures, sampleAlmanacInfo, 0, 2),
      ).toBe(0);
    });

    it("handles null almanacInfo by using sumExpTime", () => {
      expect(calculateEfficiency(sampleExposures, null, 300, 2)).toBe(null);
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

  describe("calculateTimeLoss", () => {
    it("returns defaults when no loss", () => {
      expect(calculateTimeLoss(0, 0)).toEqual([
        "0 hours",
        "(- weather; - fault)",
      ]);
    });

    it("returns total loss and breakdown", () => {
      const [loss, breakdown] = calculateTimeLoss(2, 2);
      expect(loss).toBe("4.00 hours");
      expect(breakdown).toBe("(50% weather; 50% fault)");
    });
  });

  describe("getDayobsStr", () => {
    it("returns formatted string", () => {
      const date = new Date("2024-06-07T00:00:00Z");
      expect(getDayobsStr(date)).toBe("20240607");
    });

    it("returns empty string for null/undefined", () => {
      expect(getDayobsStr(null)).toBe("");
      expect(getDayobsStr(undefined)).toBe("");
    });
  });

  describe("getDatetimeFromDayobsStr", () => {
    it("parses correctly into noon UTC", () => {
      const dt = getDatetimeFromDayobsStr("20240607");
      expect(dt.toISO()).toBe("2024-06-07T12:00:00.000Z");
    });
  });

  describe("getDisplayDateRange", () => {
    it("returns empty string if inputs invalid", () => {
      expect(getDisplayDateRange(null, 2)).toBe("");
      expect(getDisplayDateRange(new Date(), 0)).toBe("");
    });

    it("returns single date if only one night", () => {
      const day = new Date("2024-06-07");
      expect(getDisplayDateRange(day, 1)).toBe("20240607");
    });

    it("returns range if multiple nights", () => {
      const day = new Date("2024-06-07");
      expect(getDisplayDateRange(day, 3)).toBe("20240605 - 20240607");
    });
  });

  describe("getKeyByValue", () => {
    it("returns matching key", () => {
      expect(getKeyByValue({ a: 1, b: 2 }, 2)).toBe("b");
    });

    it("returns undefined if not found", () => {
      expect(getKeyByValue({ a: 1 }, 5)).toBeUndefined();
    });
  });

  describe("formatCellValue", () => {
    it("returns 'na' for empty values", () => {
      expect(formatCellValue(null)).toBe("na");
      expect(formatCellValue(undefined)).toBe("na");
      expect(formatCellValue("")).toBe("na");
    });

    it("formats numbers with inferred decimals", () => {
      expect(formatCellValue(42)).toBe("42");
      expect(formatCellValue(42.123)).toBe("42.12");
      expect(formatCellValue(12345.678)).toBe("12346"); // large number → 0 decimals
    });

    it("respects decimals option", () => {
      expect(formatCellValue(1.2345, { decimals: 3 })).toBe("1.234");
    });

    it("formats strings directly", () => {
      expect(formatCellValue("hello")).toBe("hello");
    });
  });

  describe("mergeDataLogSources", () => {
    it("merges matching rows", () => {
      const consDb = [{ "exposure name": "exp1", instrument: "na" }];
      const exposureLog = [
        {
          obs_id: "exp1",
          instrument: "cam",
          exposure_flag: "ok",
          message_text: "msg",
        },
      ];

      const merged = mergeDataLogSources(consDb, exposureLog);
      expect(merged[0].instrument).toBe("cam");
      expect(merged[0].exposure_flag).toBe("ok");
      expect(merged[0].message_text).toBe("msg");
    });

    it("fills defaults if no match", () => {
      const consDb = [{ "exposure name": "exp2" }];
      const merged = mergeDataLogSources(consDb, []);
      expect(merged[0].instrument).toBe("na");
      expect(merged[0].exposure_flag).toBe("none");
      expect(merged[0].message_text).toBe("");
    });
  });

  describe("getRubinTVUrl", () => {
    beforeEach(() => {
      vi.stubGlobal("window", {
        location: { host: "localhost", origin: "http://localhost" },
      });
    });

    it("returns null if inputs invalid", () => {
      expect(getRubinTVUrl(null, 123)).toBeNull();
      expect(getRubinTVUrl("20240607", null)).toBeNull();
    });

    it("uses dev base URL on localhost", () => {
      const url = getRubinTVUrl("20240607", 42);
      expect(url.startsWith(DEFAULT_EXTERNAL_INSTANCE_URL)).toBe(true);
      expect(url).toContain("seq_num=42");
    });

    it("uses production origin if not localhost", () => {
      window.location.host = "example.com";
      window.location.origin = "https://example.com";
      const url = getRubinTVUrl("20240607", 99);
      expect(url.startsWith("https://example.com")).toBe(true);
    });
  });

  describe("buildNavItemUrl", () => {
    it("returns '#' for hash input", () => {
      expect(buildNavItemUrl("#", "", {}, [])).toBe("#");
    });

    it("preserves allowedParams when leaving data-log", () => {
      const url = buildNavItemUrl(
        "/other",
        "/nightlydigest/data-log",
        { keep: "1", drop: "2" },
        ["keep"],
      );
      expect(url).toBe("/other?keep=1");
    });

    it("preserves all params otherwise", () => {
      const url = buildNavItemUrl(
        "/same",
        "/nightlydigest/other",
        { a: "1", b: "2" },
        [],
      );
      expect(url).toBe("/same?a=1&b=2");
    });
  });

  describe("getNightSummaryLink", () => {
    it("returns correct url and label", () => {
      const { url, label } = getNightSummaryLink("20240607");
      expect(label).toBe("2024-06-07");
      expect(url).toContain("2024/06/07");
      expect(url).toContain("nightsum_2024-06-07.html");
    });
  });

  describe("prettyTitleFromKey", () => {
    it("capitalises each word", () => {
      expect(prettyTitleFromKey("exposure time")).toBe("Exposure Time");
    });
  });

  describe("constants", () => {
    it("exports numeric constants", () => {
      expect(DEFAULT_PIXEL_SCALE_MEDIAN).toBeCloseTo(0.2);
      expect(PSF_SIGMA_FACTOR).toBeCloseTo(2.355);
    });

    it("exports default external instance URL", () => {
      expect(DEFAULT_EXTERNAL_INSTANCE_URL).toContain("slac.stanford.edu");
    });
  });
});
