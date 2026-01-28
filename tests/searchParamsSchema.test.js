import { describe, it, expect } from "vitest";
import { DateTime } from "luxon";
import { searchParamsSchema, dataLogSearchSchema } from "@/routes";
import { getDayobsStartUTC, getDayobsEndUTC } from "@/utils/timeUtils";

describe("searchParamsSchema", () => {
  describe("dayobs validation", () => {
    it("accepts valid dayobs in yyyyMMdd format", () => {
      const input = {
        startDayobs: "20240101",
        endDayobs: "20240102",
        telescope: "Simonyi",
        startTime: 1704110400000,
        endTime: 1704196800000,
      };
      const result = searchParamsSchema.parse(input);
      expect(result.startDayobs).toBe(20240101);
      expect(result.endDayobs).toBe(20240102);
    });

    it("rejects dayobs with invalid format (too short)", () => {
      const input = {
        startDayobs: "2024010",
        endDayobs: "20240102",
        telescope: "Simonyi",
        startTime: 1704110400000,
        endTime: 1704196800000,
      };
      expect(() => searchParamsSchema.parse(input)).toThrow(
        "Dayobs must be in yyyyMMdd format",
      );
    });

    it("rejects dayobs with invalid format (too long)", () => {
      const input = {
        startDayobs: "202401011",
        endDayobs: "20240102",
        telescope: "Simonyi",
        startTime: 1704110400000,
        endTime: 1704196800000,
      };
      expect(() => searchParamsSchema.parse(input)).toThrow(
        "Dayobs must be in yyyyMMdd format",
      );
    });

    it("rejects dayobs with invalid format (contains letters)", () => {
      const input = {
        startDayobs: "2024010a",
        endDayobs: "20240102",
        telescope: "Simonyi",
        startTime: 1704110400000,
        endTime: 1704196800000,
      };
      expect(() => searchParamsSchema.parse(input)).toThrow(
        "Dayobs must be in yyyyMMdd format",
      );
    });

    it("rejects dayobs with invalid calendar date (month 13)", () => {
      const input = {
        startDayobs: "20241301",
        endDayobs: "20240102",
        telescope: "Simonyi",
        startTime: 1704110400000,
        endTime: 1704196800000,
      };
      expect(() => searchParamsSchema.parse(input)).toThrow(
        "Not a valid calendar date",
      );
    });

    it("rejects dayobs with invalid calendar date (day 32)", () => {
      const input = {
        startDayobs: "20240132",
        endDayobs: "20240201",
        telescope: "Simonyi",
        startTime: 1704110400000,
        endTime: 1704196800000,
      };
      expect(() => searchParamsSchema.parse(input)).toThrow(
        "Not a valid calendar date",
      );
    });

    it("rejects dayobs with invalid calendar date (Feb 30)", () => {
      const input = {
        startDayobs: "20240230",
        endDayobs: "20240301",
        telescope: "Simonyi",
        startTime: 1704110400000,
        endTime: 1704196800000,
      };
      expect(() => searchParamsSchema.parse(input)).toThrow(
        "Not a valid calendar date",
      );
    });

    it("accepts Feb 29 in leap year", () => {
      const input = {
        startDayobs: "20240229",
        endDayobs: "20240301",
        telescope: "Simonyi",
        startTime: 1709211600000,
        endTime: 1709298000000,
      };
      const result = searchParamsSchema.parse(input);
      expect(result.startDayobs).toBe(20240229);
    });

    it("rejects Feb 29 in non-leap year", () => {
      const input = {
        startDayobs: "20230229",
        endDayobs: "20230301",
        telescope: "Simonyi",
        startTime: 1677675600000,
        endTime: 1677762000000,
      };
      expect(() => searchParamsSchema.parse(input)).toThrow(
        "Not a valid calendar date",
      );
    });
  });

  describe("dayobs ordering validation", () => {
    it("accepts startDayobs equal to endDayobs", () => {
      const input = {
        startDayobs: "20240101",
        endDayobs: "20240101",
        telescope: "Simonyi",
        startTime: 1704110400000,
        endTime: 1704196800000,
      };
      const result = searchParamsSchema.parse(input);
      expect(result.startDayobs).toBe(20240101);
      expect(result.endDayobs).toBe(20240101);
    });

    it("accepts startDayobs before endDayobs", () => {
      const input = {
        startDayobs: "20240101",
        endDayobs: "20240105",
        telescope: "Simonyi",
        startTime: 1704110400000,
        endTime: 1704456000000,
      };
      const result = searchParamsSchema.parse(input);
      expect(result.startDayobs).toBe(20240101);
      expect(result.endDayobs).toBe(20240105);
    });

    it("rejects startDayobs after endDayobs", () => {
      const input = {
        startDayobs: "20240105",
        endDayobs: "20240101",
        telescope: "Simonyi",
        startTime: 1704110400000,
        endTime: 1704196800000,
      };
      expect(() => searchParamsSchema.parse(input)).toThrow(
        "startDayobs must be before or equal to endDayobs",
      );
    });
  });

  describe("telescope validation", () => {
    it("accepts Simonyi telescope", () => {
      const input = {
        startDayobs: "20240101",
        endDayobs: "20240101",
        telescope: "Simonyi",
        startTime: 1704110400000,
        endTime: 1704196800000,
      };
      const result = searchParamsSchema.parse(input);
      expect(result.telescope).toBe("Simonyi");
    });

    it("accepts AuxTel telescope", () => {
      const input = {
        startDayobs: "20240101",
        endDayobs: "20240101",
        telescope: "AuxTel",
        startTime: 1704110400000,
        endTime: 1704196800000,
      };
      const result = searchParamsSchema.parse(input);
      expect(result.telescope).toBe("AuxTel");
    });

    it("rejects invalid telescope name", () => {
      const input = {
        startDayobs: "20240101",
        endDayobs: "20240101",
        telescope: "InvalidTelescope",
        startTime: 1704110400000,
        endTime: 1704196800000,
      };
      expect(() => searchParamsSchema.parse(input)).toThrow();
    });

    it("defaults to Simonyi when telescope is not provided", () => {
      const input = {
        startDayobs: "20240101",
        endDayobs: "20240101",
        startTime: 1704110400000,
        endTime: 1704196800000,
      };
      const result = searchParamsSchema.parse(input);
      expect(result.telescope).toBe("Simonyi");
    });
  });

  describe("time validation", () => {
    it("accepts valid integer timestamps", () => {
      const input = {
        startDayobs: "20240101",
        endDayobs: "20240101",
        telescope: "Simonyi",
        startTime: 1704110400000,
        endTime: 1704196799000,
      };
      const result = searchParamsSchema.parse(input);
      expect(result.startTime).toBe(1704110400000);
      expect(result.endTime).toBe(1704196799000);
    });

    it("coerces string timestamps to numbers", () => {
      const input = {
        startDayobs: "20240101",
        endDayobs: "20240101",
        telescope: "Simonyi",
        startTime: "1704110400000",
        endTime: "1704196799000",
      };
      const result = searchParamsSchema.parse(input);
      expect(result.startTime).toBe(1704110400000);
      expect(result.endTime).toBe(1704196799000);
    });

    it("rejects negative timestamps", () => {
      const input = {
        startDayobs: "20240101",
        endDayobs: "20240101",
        telescope: "Simonyi",
        startTime: -1000,
        endTime: 1704196800000,
      };
      expect(() => searchParamsSchema.parse(input)).toThrow();
    });

    it("rejects non-integer timestamps", () => {
      const input = {
        startDayobs: "20240101",
        endDayobs: "20240101",
        telescope: "Simonyi",
        startTime: 1704110400000.5,
        endTime: 1704196800000,
      };
      expect(() => searchParamsSchema.parse(input)).toThrow();
    });
  });

  describe("time ordering and clamping", () => {
    it("swaps startTime and endTime when reversed", () => {
      const input = {
        startDayobs: "20240101",
        endDayobs: "20240101",
        telescope: "Simonyi",
        startTime: 1704196799000, // later time
        endTime: 1704110400000, // earlier time
      };
      const result = searchParamsSchema.parse(input);
      // Should be swapped
      expect(result.startTime).toBe(1704110400000);
      expect(result.endTime).toBe(1704196799000);
    });

    it("clamps startTime to dayobs start boundary when too early", () => {
      const dayobs = "20240101";
      const dayobsStartMillis = getDayobsStartUTC(dayobs).toMillis();
      const tooEarlyTime = dayobsStartMillis - 1000000; // 1000 seconds before

      const input = {
        startDayobs: dayobs,
        endDayobs: dayobs,
        telescope: "Simonyi",
        startTime: tooEarlyTime,
        endTime: dayobsStartMillis + 1000000,
      };
      const result = searchParamsSchema.parse(input);
      expect(result.startTime).toBe(dayobsStartMillis);
    });

    it("clamps endTime to dayobs end boundary when too late", () => {
      const dayobs = "20240101";
      const dayobsEndMillis = getDayobsEndUTC(dayobs).toMillis();
      const tooLateTime = dayobsEndMillis + 1000000; // 1000 seconds after

      const input = {
        startDayobs: dayobs,
        endDayobs: dayobs,
        telescope: "Simonyi",
        startTime: dayobsEndMillis - 1000000,
        endTime: tooLateTime,
      };
      const result = searchParamsSchema.parse(input);
      expect(result.endTime).toBe(dayobsEndMillis);
    });

    it("handles multi-day range clamping correctly", () => {
      const startDayobs = "20240101";
      const endDayobs = "20240103";
      const startBoundary = getDayobsStartUTC(startDayobs).toMillis();
      const endBoundary = getDayobsEndUTC(endDayobs).toMillis();

      const input = {
        startDayobs,
        endDayobs,
        telescope: "Simonyi",
        startTime: startBoundary - 5000000, // way before start
        endTime: endBoundary + 5000000, // way after end
      };
      const result = searchParamsSchema.parse(input);
      expect(result.startTime).toBe(startBoundary);
      expect(result.endTime).toBe(endBoundary);
    });

    it("preserves times within dayobs boundaries", () => {
      const dayobs = "20240101";
      const startBoundary = getDayobsStartUTC(dayobs).toMillis();
      const endBoundary = getDayobsEndUTC(dayobs).toMillis();
      const validStart = startBoundary + 1000000;
      const validEnd = endBoundary - 1000000;

      const input = {
        startDayobs: dayobs,
        endDayobs: dayobs,
        telescope: "Simonyi",
        startTime: validStart,
        endTime: validEnd,
      };
      const result = searchParamsSchema.parse(input);
      expect(result.startTime).toBe(validStart);
      expect(result.endTime).toBe(validEnd);
    });
  });

  describe("default values", () => {
    it("provides default values when fields are missing", () => {
      const input = {};
      const result = searchParamsSchema.parse(input);

      // Should have defaults
      expect(result.startDayobs).toBeDefined();
      expect(result.endDayobs).toBeDefined();
      expect(result.telescope).toBe("Simonyi");
      expect(result.startTime).toBeDefined();
      expect(result.endTime).toBeDefined();

      // Dayobs defaults should be yesterday
      const yesterday = DateTime.utc().minus({ days: 1 }).toFormat("yyyyMMdd");
      expect(result.startDayobs).toBe(parseInt(yesterday));
      expect(result.endDayobs).toBe(parseInt(yesterday));
    });

    it("uses provided values instead of defaults", () => {
      const input = {
        startDayobs: "20240615",
        endDayobs: "20240616",
        telescope: "AuxTel",
        startTime: 1718467200000,
        endTime: 1718553600000,
      };
      const result = searchParamsSchema.parse(input);

      expect(result.startDayobs).toBe(20240615);
      expect(result.endDayobs).toBe(20240616);
      expect(result.telescope).toBe("AuxTel");
      expect(result.startTime).toBe(1718467200000);
      expect(result.endTime).toBe(1718553600000);
    });

    it("defaults startTime based on provided startDayobs when startTime is missing", () => {
      const input = {
        startDayobs: "20240615",
        endDayobs: "20240616",
        telescope: "Simonyi",
        endTime: 1718553600000,
      };
      const result = searchParamsSchema.parse(input);

      const expectedStartTime = getDayobsStartUTC("20240615").toMillis();
      expect(result.startTime).toBe(expectedStartTime);
      expect(result.endTime).toBe(1718553600000);
    });

    it("defaults endTime based on provided endDayobs when endTime is missing", () => {
      const input = {
        startDayobs: "20240615",
        endDayobs: "20240616",
        telescope: "Simonyi",
        startTime: 1718467200000,
      };
      const result = searchParamsSchema.parse(input);

      const expectedEndTime = getDayobsEndUTC("20240616").toMillis();
      expect(result.startTime).toBe(1718467200000);
      expect(result.endTime).toBe(expectedEndTime);
    });

    it("defaults both startTime and endTime based on provided dayobs values", () => {
      const input = {
        startDayobs: "20240615",
        endDayobs: "20240616",
        telescope: "Simonyi",
      };
      const result = searchParamsSchema.parse(input);

      const expectedStartTime = getDayobsStartUTC("20240615").toMillis();
      const expectedEndTime = getDayobsEndUTC("20240616").toMillis();
      expect(result.startTime).toBe(expectedStartTime);
      expect(result.endTime).toBe(expectedEndTime);
    });

    it("defaults startTime and endTime based on default dayobs when all are missing", () => {
      const input = {
        telescope: "Simonyi",
      };
      const result = searchParamsSchema.parse(input);

      const yesterday = DateTime.utc().minus({ days: 1 }).toFormat("yyyyMMdd");
      const expectedStartTime = getDayobsStartUTC(yesterday).toMillis();
      const expectedEndTime = getDayobsEndUTC(yesterday).toMillis();

      expect(result.startDayobs).toBe(parseInt(yesterday));
      expect(result.endDayobs).toBe(parseInt(yesterday));
      expect(result.startTime).toBe(expectedStartTime);
      expect(result.endTime).toBe(expectedEndTime);
    });

    it("defaults times correctly when dayobs differ", () => {
      const input = {
        startDayobs: "20240101",
        endDayobs: "20240105",
        telescope: "Simonyi",
      };
      const result = searchParamsSchema.parse(input);

      // startTime should be based on startDayobs
      const expectedStartTime = getDayobsStartUTC("20240101").toMillis();
      // endTime should be based on endDayobs
      const expectedEndTime = getDayobsEndUTC("20240105").toMillis();

      expect(result.startTime).toBe(expectedStartTime);
      expect(result.endTime).toBe(expectedEndTime);
    });
  });

  describe("edge cases", () => {
    it("handles year boundaries correctly", () => {
      const input = {
        startDayobs: "20231231",
        endDayobs: "20240101",
        telescope: "Simonyi",
        startTime: 1704024000000,
        endTime: 1704196800000,
      };
      const result = searchParamsSchema.parse(input);
      expect(result.startDayobs).toBe(20231231);
      expect(result.endDayobs).toBe(20240101);
    });

    it("handles same startTime and endTime", () => {
      const sameTime = 1704110400000;
      const input = {
        startDayobs: "20240101",
        endDayobs: "20240101",
        telescope: "Simonyi",
        startTime: sameTime,
        endTime: sameTime,
      };
      const result = searchParamsSchema.parse(input);
      expect(result.startTime).toBe(sameTime);
      expect(result.endTime).toBe(sameTime);
    });
  });
});

describe("dataLogSearchSchema", () => {
  describe("filter fields", () => {
    it("accepts science_program filter as string array", () => {
      const input = {
        startDayobs: "20240101",
        endDayobs: "20240101",
        telescope: "Simonyi",
        startTime: 1704110400000,
        endTime: 1704196799000,
        science_program: ["BLOCK-123", "BLOCK-456"],
      };
      const result = dataLogSearchSchema.parse(input);
      expect(result.science_program).toEqual(["BLOCK-123", "BLOCK-456"]);
    });

    it("accepts img_type filter as string array", () => {
      const input = {
        startDayobs: "20240101",
        endDayobs: "20240101",
        telescope: "Simonyi",
        startTime: 1704110400000,
        endTime: 1704196799000,
        img_type: ["SKYEXP", "BIAS"],
      };
      const result = dataLogSearchSchema.parse(input);
      expect(result.img_type).toEqual(["SKYEXP", "BIAS"]);
    });

    it("accepts observation_reason filter as string array", () => {
      const input = {
        startDayobs: "20240101",
        endDayobs: "20240101",
        telescope: "Simonyi",
        startTime: 1704110400000,
        endTime: 1704196799000,
        observation_reason: ["science", "calibration"],
      };
      const result = dataLogSearchSchema.parse(input);
      expect(result.observation_reason).toEqual(["science", "calibration"]);
    });

    it("accepts target_name filter as string array", () => {
      const input = {
        startDayobs: "20240101",
        endDayobs: "20240101",
        telescope: "Simonyi",
        startTime: 1704110400000,
        endTime: 1704196799000,
        target_name: ["NGC 1234", "M31"],
      };
      const result = dataLogSearchSchema.parse(input);
      expect(result.target_name).toEqual(["NGC 1234", "M31"]);
    });

    it("accepts multiple filter fields simultaneously", () => {
      const input = {
        startDayobs: "20240101",
        endDayobs: "20240101",
        telescope: "Simonyi",
        startTime: 1704110400000,
        endTime: 1704196799000,
        science_program: ["BLOCK-123"],
        img_type: ["SKYEXP"],
        observation_reason: ["science"],
        target_name: ["NGC 1234"],
      };
      const result = dataLogSearchSchema.parse(input);
      expect(result.science_program).toEqual(["BLOCK-123"]);
      expect(result.img_type).toEqual(["SKYEXP"]);
      expect(result.observation_reason).toEqual(["science"]);
      expect(result.target_name).toEqual(["NGC 1234"]);
    });

    it("treats filter fields as optional", () => {
      const input = {
        startDayobs: "20240101",
        endDayobs: "20240101",
        telescope: "Simonyi",
        startTime: 1704110400000,
        endTime: 1704196799000,
      };
      const result = dataLogSearchSchema.parse(input);
      expect(result.science_program).toBeUndefined();
      expect(result.img_type).toBeUndefined();
      expect(result.observation_reason).toBeUndefined();
      expect(result.target_name).toBeUndefined();
    });

    it("accepts empty arrays for filters", () => {
      const input = {
        startDayobs: "20240101",
        endDayobs: "20240101",
        telescope: "Simonyi",
        startTime: 1704110400000,
        endTime: 1704196799000,
        science_program: [],
      };
      const result = dataLogSearchSchema.parse(input);
      expect(result.science_program).toEqual([]);
    });

    it("rejects non-array values for filter fields", () => {
      const input = {
        startDayobs: "20240101",
        endDayobs: "20240101",
        telescope: "Simonyi",
        startTime: 1704110400000,
        endTime: 1704196799000,
        science_program: "BLOCK-123", // Should be an array
      };
      expect(() => dataLogSearchSchema.parse(input)).toThrow();
    });

    it("rejects non-string array elements", () => {
      const input = {
        startDayobs: "20240101",
        endDayobs: "20240101",
        telescope: "Simonyi",
        startTime: 1704110400000,
        endTime: 1704196799000,
        science_program: [123, 456], // Should be strings
      };
      expect(() => dataLogSearchSchema.parse(input)).toThrow();
    });
  });

  describe("applies common validations and transformations", () => {
    it("swaps reversed times like searchParamsSchema", () => {
      const input = {
        startDayobs: "20240101",
        endDayobs: "20240101",
        telescope: "Simonyi",
        startTime: 1704196799000, // later
        endTime: 1704110400000, // earlier
        science_program: ["BLOCK-123"],
      };
      const result = dataLogSearchSchema.parse(input);
      expect(result.startTime).toBe(1704110400000);
      expect(result.endTime).toBe(1704196799000);
      expect(result.science_program).toEqual(["BLOCK-123"]);
    });

    it("clamps times to dayobs boundaries like searchParamsSchema", () => {
      const dayobs = "20240101";
      const dayobsStartMillis = getDayobsStartUTC(dayobs).toMillis();
      const dayobsEndMillis = getDayobsEndUTC(dayobs).toMillis();

      const input = {
        startDayobs: dayobs,
        endDayobs: dayobs,
        telescope: "Simonyi",
        startTime: dayobsStartMillis - 1000000,
        endTime: dayobsEndMillis + 1000000,
        img_type: ["SKYEXP"],
      };
      const result = dataLogSearchSchema.parse(input);
      expect(result.startTime).toBe(dayobsStartMillis);
      expect(result.endTime).toBe(dayobsEndMillis);
      expect(result.img_type).toEqual(["SKYEXP"]);
    });
  });
});
