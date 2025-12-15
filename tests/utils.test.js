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
  getSiteConfig,
  buildNavItemUrl,
  getNightSummaryLink,
  prettyTitleFromKey,
  DEFAULT_PIXEL_SCALE_MEDIAN,
  PSF_SIGMA_FACTOR,
  DEFAULT_EXTERNAL_INSTANCE_URL,
  SITE_CONFIGURATION,
  parseBackendVersion,
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
// Mock the Object.groupBy method for testing purposes
// because the CI is using node 18 which doesn't support it
if (!Object.groupBy) {
  Object.groupBy = function (items, callback) {
    if (items == null) {
      throw new TypeError("Object.groupBy called on null or undefined");
    }
    if (typeof callback !== "function") {
      throw new TypeError("callback must be a function");
    }

    const obj = {};
    for (const item of items) {
      const key = callback(item);
      if (!Object.prototype.hasOwnProperty.call(obj, key)) {
        obj[key] = [];
      }
      obj[key].push(item);
    }
    return obj;
  };
}

describe("utils", () => {
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
      const sumExpTime = 300;
      const sumExpTimeBetweenTwilights = 280;
      const weatherLoss = 2;
      const nightHours = 11;
      // eff = (100 * 280 / 3600) / (11 - 2)
      const expected = Math.round((100 * 280) / 3600 / 9);
      expect(
        calculateEfficiency(
          nightHours,
          sumExpTime,
          sumExpTimeBetweenTwilights,
          weatherLoss,
        ),
      ).toBe(expected);
    });

    it("returns 0 if sumExpTime is 0", () => {
      expect(calculateEfficiency(11, 0, null, 2)).toBe(0);
    });

    it("returns null if nightHours is 0", () => {
      expect(calculateEfficiency(0, 310, 300, 2)).toBe(null);
    });

    it("uses sumExpTime if totalExpTimeBetweenTwilights is null", () => {
      const sumExpTime = 280;
      const sumExpTimeBetweenTwilights = null;
      const weatherLoss = 2;
      const nightHours = 11;
      const expected = Math.round((100 * 280) / (3600 * 9));
      expect(
        calculateEfficiency(
          nightHours,
          sumExpTime,
          sumExpTimeBetweenTwilights,
          weatherLoss,
        ),
      ).toBe(expected);
    });

    it("handles null weatherLoss", () => {
      expect(calculateEfficiency(11, 280, 250, null)).toBe(null);
    });

    it("handles negative weatherLoss", () => {
      expect(calculateEfficiency(11, 300, 280, -2)).toBe(null);
    });

    it("handles undefined weatherLoss", () => {
      expect(calculateEfficiency(11, 300, 280, undefined)).toBe(null);
    });

    it("handles 0 weatherLoss", () => {
      expect(calculateEfficiency(11, 300, 280, 0)).toBe(
        Math.round((100 * 280) / 3600 / 11),
      );
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

    it("doesn't return current day if date time is midnight for timezones behind of UTC", () => {
      const date = new Date("2024-06-07T00:00:00Z");
      expect(getDayobsStr(date, "America/Santiago")).not.toBe("20240607"); // UTC-4
      expect(getDayobsStr(date, "America/New_York")).not.toBe("20240607"); // UTC-5
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
      expect(getRubinTVUrl("Simonyi", null, 123)).toBeNull();
      expect(getRubinTVUrl("AuxTel", "20240607", null)).toBeNull();
    });

    it("uses dev base URL on localhost", () => {
      const dateStr =
        getDatetimeFromDayobsStr("20240607").toFormat("yyyy-MM-dd");

      const urlSimonyi = getRubinTVUrl("Simonyi", "20240607", 42);
      const expectedUrlSimonyi =
        DEFAULT_EXTERNAL_INSTANCE_URL +
        "/rubintv/summit-usdf/lsstcam" +
        "/event?channel_name=focal_plane_mosaic" +
        `&date_str=${dateStr}` +
        "&seq_num=42";
      expect(urlSimonyi).toBe(expectedUrlSimonyi);

      const urlAuxTel = getRubinTVUrl("AuxTel", "20240607", 43);
      const expectedUrlAuxTel =
        DEFAULT_EXTERNAL_INSTANCE_URL +
        "/rubintv/summit-usdf/auxtel" +
        "/event?channel_name=monitor" +
        `&date_str=${dateStr}` +
        "&seq_num=43";
      expect(urlAuxTel).toBe(expectedUrlAuxTel);
    });

    it("uses production origin if not localhost", () => {
      for (const [site, config] of Object.entries(SITE_CONFIGURATION)) {
        window.location.host = site;
        window.location.origin = `https://${site}`;

        const dateStr =
          getDatetimeFromDayobsStr("20240607").toFormat("yyyy-MM-dd");

        const urlSimonyi = getRubinTVUrl("Simonyi", "20240607", 99);
        const expectedUrlSimonyi =
          `https://${site}/rubintv/${config.rubinTVSiteSuffix}/lsstcam` +
          "/event?channel_name=focal_plane_mosaic" +
          `&date_str=${dateStr}` +
          "&seq_num=99";
        expect(urlSimonyi).toBe(expectedUrlSimonyi);

        const urlAuxTel = getRubinTVUrl("AuxTel", "20240607", 100);
        const expectedUrlAuxTel =
          `https://${site}/rubintv/${config.rubinTVSiteSuffix}/auxtel` +
          "/event?channel_name=monitor" +
          `&date_str=${dateStr}` +
          "&seq_num=100";
        expect(urlAuxTel).toBe(expectedUrlAuxTel);
      }
    });

    it("raises error for unknown host", () => {
      window.location.host = "unknownhost.com";
      window.location.origin = "https://unknownhost.com";

      expect(() => getRubinTVUrl("Simonyi", "20240607", 1)).toThrowError(
        /^Unknown host for RubinTV URL: unknownhost.com$/,
      );
      expect(() => getRubinTVUrl("AuxTel", "20240607", 2)).toThrowError(
        /^Unknown host for RubinTV URL: unknownhost.com$/,
      );
    });
  });

  describe("getSiteConfig", () => {
    it("returns config for valid hosts", () => {
      for (const [site, config] of Object.entries(SITE_CONFIGURATION)) {
        expect(getSiteConfig(site)).toEqual(config);
      }
    });

    it("throws error for unknown host", () => {
      expect(() => getSiteConfig("unknownhost.com")).toThrowError(
        "Unknown host for RubinTV URL: unknownhost.com",
      );
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

  describe("parseBackendVersion", () => {
    it("parses valid version strings correctly", () => {
      expect(parseBackendVersion("1.2.3")).toBe("1.2.3");
      expect(parseBackendVersion("1.2.3a1")).toBe("1.2.3-alpha.1");
      expect(parseBackendVersion("1.2.3rc1")).toBe("1.2.3-rc.1");
    });

    it("returns 'main' for invalid version strings", () => {
      expect(parseBackendVersion("invalid-version")).toBe("main");
      expect(parseBackendVersion("v1.2")).toBe("main");
      expect(parseBackendVersion("")).toBe("main");
      expect(parseBackendVersion("1.2.3-unknown")).toBe("main");
      expect(parseBackendVersion("1.2.3.dev1+g6c0764173.d20251021")).toBe(
        "main",
      );
      expect(parseBackendVersion("1.2.3-alpha.1")).toBe("main");
      expect(parseBackendVersion("1.2.3a-1")).toBe("main");
      expect(parseBackendVersion("1.2.3b1")).toBe("main");
    });
  });
});
