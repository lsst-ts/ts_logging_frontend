import { describe, it, expect, beforeEach, vi } from "vitest";

import {
  calculateEfficiency,
  calculateSumExpTimeBetweenTwilights,
  calculateTimeLoss,
  getDayobsStr,
  getDisplayDateRange,
  getKeyByValue,
  formatCellValue,
  mergeAllDataLogSources,
  mergeContextFeedSources,
  getRubinTVUrl,
  getSiteConfig,
  buildNavigationWithSearchParams,
  getNightSummaryLink,
  prettyTitleFromKey,
  DEFAULT_PIXEL_SCALE_MEDIAN,
  PSF_SIGMA_FACTOR,
  DEFAULT_EXTERNAL_INSTANCE_URL,
  SITE_CONFIGURATION,
  parseBackendVersion,
  getZephyrUrl,
} from "@/utils/utils";
import { getDayobsStartUTC } from "@/utils/timeUtils";
import { CATEGORY_INDEX_INFO } from "@/components/context-feed-definitions.js";
import { GLOBAL_SEARCH_PARAMS } from "@/routes";

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
        "0 hrs",
        "(- weather; - fault)",
      ]);
    });

    it("returns total loss and breakdown", () => {
      const [loss, breakdown] = calculateTimeLoss(2, 2);
      expect(loss).toBe("4.00 hrs");
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

  describe("mergeAllDataLogSources", () => {
    const baseRow = (overrides = {}) => ({
      "exposure name": "exp1",
      exposure_id: "1",
      psf_sigma_median: "1",
      pixel_scale_median: 1,
      science_program: "BLOCK-T250",
      instrument: "na",
      obs_start: "2025-01-01T00:00:00Z",
      ...overrides,
    });

    it("merges exposure log fields when matching", () => {
      const consDb = [baseRow()];

      const exposureLog = [
        {
          obs_id: "exp1",
          instrument: "cam",
          exposure_flag: "ok",
          message_text: "msg",
        },
      ];

      const blockLookup = {
        "BLOCK-T250": {
          summary: "This block tests some things",
          url: "zephyr/things/BLOCK-T250",
          source: "zephyr",
        },
      };

      const merged = mergeAllDataLogSources(consDb, exposureLog, blockLookup);

      expect(merged[0].instrument).toBe("cam");
      expect(merged[0].exposure_flag).toBe("ok");
      expect(merged[0].message_text).toBe("msg");
    });

    it("fills defaults if no exposure log match", () => {
      const consDb = [baseRow()];

      const merged = mergeAllDataLogSources(consDb, [], {});

      expect(merged[0].instrument).toBe("na");
      expect(merged[0].exposure_flag).toBe("none");
      expect(merged[0].message_text).toBe("");
    });

    it("adds BLOCK description when science_program matches", () => {
      const consDb = [baseRow()];

      const blockLookup = {
        "BLOCK-T250": {
          summary: "This block tests some things",
          url: "zephyr/things/BLOCK-T250",
          source: "zephyr",
        },
      };

      const merged = mergeAllDataLogSources(consDb, [], blockLookup);

      expect(merged[0].block_description).toBe("This block tests some things");
    });

    it("defaults block_description to empty string if no match", () => {
      const consDb = [baseRow({ science_program: "UNKNOWN" })];

      const merged = mergeAllDataLogSources(consDb, [], {});

      expect(merged[0].block_description).toBe("");
    });

    it("computes psf_median correctly", () => {
      const consDb = [
        baseRow({
          psf_sigma_median: "2",
          pixel_scale_median: 1,
        }),
      ];

      const merged = mergeAllDataLogSources(consDb, [], {});

      expect(merged[0].psf_median).toBe(2 * PSF_SIGMA_FACTOR * 1);
    });

    it("sorts rows by exposure_id descending", () => {
      const consDb = [
        baseRow({ exposure_id: "1" }),
        baseRow({
          "exposure name": "exp2",
          exposure_id: "2",
        }),
      ];

      const merged = mergeAllDataLogSources(consDb, [], {});

      expect(merged[0].exposure_id).toBe("2");
      expect(merged[1].exposure_id).toBe("1");
    });

    it("adds obs_start_millis derived from obs_start", () => {
      const consDb = [baseRow({ obs_start: "2025-01-01T00:00:00Z" })];

      const merged = mergeAllDataLogSources(consDb, [], {});

      expect(merged[0].obs_start_millis).toBe(1735689600000);
    });
  });

  describe("mergeContextFeedSources", () => {
    const baseRow = (overrides = {}) => ({
      name: "BLOCK-T250",
      description: "original description",
      category_index: 10,
      finalStatus: "Something",
      time: "2025-01-01T00:00:00Z",
      ...overrides,
    });

    it("adds BLOCK description when BLOCK key matches", () => {
      const rubinRows = [baseRow()];

      const blockLookup = {
        "BLOCK-T250": {
          summary: "This block tests some things",
          url: "zephyr/things/BLOCK-T250",
          source: "zephyr",
        },
      };

      const merged = mergeContextFeedSources(rubinRows, blockLookup);

      expect(merged[0].description).toBe("This block tests some things");
    });

    it("keeps original description if no BLOCKs match", () => {
      const rubinRows = [
        baseRow({
          name: "BLOCK-UNKNOWN",
          description: "original description",
        }),
      ];

      const merged = mergeContextFeedSources(rubinRows, {});

      expect(merged[0].description).toBe("original description");
    });

    it("does not override description if category_index is not 10", () => {
      const rubinRows = [
        baseRow({
          category_index: 5,
          description: "original description",
        }),
      ];

      const blockLookup = {
        "BLOCK-T250": {
          summary: "This block tests some things",
          url: "zephyr/things/BLOCK-T250",
          source: "zephyr",
        },
      };

      const merged = mergeContextFeedSources(rubinRows, blockLookup);

      expect(merged[0].description).toBe("original description");
    });

    it("sets current_task when a Task Change occurs", () => {
      const rubinRows = [
        baseRow({
          name: "BLOCK-T100",
          finalStatus: "Task Change",
        }),
        baseRow({
          name: "event1",
        }),
      ];

      const merged = mergeContextFeedSources(rubinRows, {});

      expect(merged[0].current_task).toBe("BLOCK-T100");
      expect(merged[1].current_task).toBe("BLOCK-T100");
    });

    it("adds derived event_time_millis", () => {
      const rubinRows = [
        baseRow({
          time: "2025-01-01T00:00:00Z",
        }),
      ];

      const merged = mergeContextFeedSources(rubinRows, {});

      expect(merged[0].event_time_millis).toBe(1735689600000);
    });

    it("sorts rows chronologically by event_time_millis", () => {
      const rubinRows = [
        baseRow({
          time: "2025-01-02T00:00:00Z",
        }),
        baseRow({
          name: "earlier",
          time: "2025-01-01T00:00:00Z",
        }),
      ];

      const merged = mergeContextFeedSources(rubinRows, {});

      expect(merged[0].name).toBe("earlier");
      expect(merged[1].name).toBe("BLOCK-T250");
    });

    it("adds category display metadata", () => {
      const rubinRows = [baseRow({ category_index: 10 })];

      const merged = mergeContextFeedSources(rubinRows, {});

      const expectedInfo = CATEGORY_INDEX_INFO[10];

      expect(merged[0].event_type).toBe(expectedInfo.label);
      expect(merged[0].event_color).toBe(expectedInfo.color ?? "#ffffff");
      expect(merged[0].displayIndex).toBe(expectedInfo.displayIndex);
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
      const dateStr = getDayobsStartUTC("20240607").toFormat("yyyy-MM-dd");

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

        const dateStr = getDayobsStartUTC("20240607").toFormat("yyyy-MM-dd");

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

  describe("buildNavigationWithSearchParams", () => {
    it("returns object with empty search for hash input", () => {
      const result = buildNavigationWithSearchParams("#", "", {}, []);
      expect(result).toEqual({ to: "#", from: "", search: {} });
    });

    it("filters search params to only allowedParams", () => {
      const result = buildNavigationWithSearchParams(
        "/other",
        "/nightlydigest/plots",
        { keep: "1", drop: "2" },
        ["keep"],
      );
      expect(result).toEqual({
        to: "/other",
        from: "/nightlydigest/plots",
        search: { keep: "1" },
      });
    });

    it("preserves all params when all are in allowedParams", () => {
      const result = buildNavigationWithSearchParams(
        "/same",
        "/nightlydigest/plots",
        { a: "1", b: "2" },
        ["a", "b"],
      );
      expect(result).toEqual({
        to: "/same",
        from: "/nightlydigest/plots",
        search: { a: "1", b: "2" },
      });
    });

    it("returns empty search when no params are in allowedParams", () => {
      const result = buildNavigationWithSearchParams(
        "/other",
        "/nightlydigest/plots",
        { a: "1", b: "2" },
        [],
      );
      expect(result).toEqual({
        to: "/other",
        from: "/nightlydigest/plots",
        search: {},
      });
    });

    it("uses GLOBAL_SEARCH_PARAMS as default allowedParams", () => {
      // Create search object with params from GLOBAL_SEARCH_PARAMS plus extras
      const searchWithExtras = {
        ...Object.fromEntries(
          GLOBAL_SEARCH_PARAMS.map((key) => [key, "value"]),
        ),
        extraParam: "shouldBeFiltered",
      };

      const result = buildNavigationWithSearchParams(
        "/other",
        "/nightlydigest/plots",
        searchWithExtras,
        // Omit fourth parameter to test default
      );

      // Should only include GLOBAL_SEARCH_PARAMS, not extraParam
      const expectedSearch = Object.fromEntries(
        GLOBAL_SEARCH_PARAMS.map((key) => [key, "value"]),
      );

      expect(result.search).toEqual(expectedSearch);
      expect(result.search.extraParam).toBeUndefined();
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
      expect(prettyTitleFromKey("exposure_time")).toBe("Exposure Time");
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

  describe("getZephyrUrl", () => {
    it("returns null if testCase is missing", () => {
      expect(getZephyrUrl(null)).toBeNull();
      expect(getZephyrUrl(undefined)).toBeNull();
      expect(getZephyrUrl("")).toBeNull();
    });

    it("returns correct Zephyr URL for valid test case key", () => {
      const key = "BLOCK-T123";
      const expectedUrl =
        "https://rubinobs.atlassian.net/projects/BLOCK" +
        "?selectedItem=com.atlassian.plugins.atlassian-connect-plugin:com.kanoah.test-manager__main-project-page" +
        "#!/v2/testCase/BLOCK-T123";

      expect(getZephyrUrl(key)).toBe(expectedUrl);
    });
  });
});
