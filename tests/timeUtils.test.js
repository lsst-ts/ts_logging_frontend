import { describe, it, expect } from "vitest";

import { DateTime } from "luxon";
import {
  isoToTAI,
  isoToUTC,
  getDayobsStartTAI,
  getDayobsEndTAI,
  getDayobsStartUTC,
  getDayobsEndUTC,
  almanacDayobsForPlot,
  millisToDateTime,
  millisToHHmm,
  utcDateTimeStrToTAIMillis,
  utcDateTimeStrToMillis,
  dayobsAtMidnight,
  getValidTimeRange,
} from "../src/utils/timeUtils";

const TAI_OFFSET_SECONDS = 37;

describe("timeUtils", () => {
  describe("isoToTAI", () => {
    it("applies the TAI offset correctly", () => {
      const dt = isoToTAI("2025-08-18T00:00:00Z");
      expect(dt.toISO()).toBe("2025-08-18T00:00:37.000Z");
    });
  });

  describe("isoToUTC", () => {
    it("parses ISO string without TAI offset", () => {
      const dt = isoToUTC("2025-08-18T00:00:00Z");
      expect(dt.toISO()).toBe("2025-08-18T00:00:00.000Z");
    });
  });

  describe("getDayobsStartTAI", () => {
    it("returns 12:00 noon TAI for the given dayobs", () => {
      const dt = getDayobsStartTAI("20250818");
      expect(dt.toISO()).toBe("2025-08-18T12:00:37.000Z");
    });
  });

  describe("getDayobsEndTAI", () => {
    it("returns 11:59 next day TAI for the given dayobs", () => {
      const dt = getDayobsEndTAI("20250818");
      expect(dt.toISO()).toBe("2025-08-19T11:59:37.000Z");
    });
  });

  describe("getDayobsStartUTC", () => {
    it("returns 12:00 noon UTC for the given dayobs", () => {
      const dt = getDayobsStartUTC("20250818");
      expect(dt.toISO()).toBe("2025-08-18T12:00:00.000Z");
    });
  });

  describe("getDayobsEndUTC", () => {
    it("returns 11:59 next day UTC for the given dayobs", () => {
      const dt = getDayobsEndUTC("20250818");
      expect(dt.toISO()).toBe("2025-08-19T11:59:59.000Z");
    });
  });

  describe("almanacDayobsForPlot", () => {
    it("subtracts one day from the input dayobs", () => {
      const result = almanacDayobsForPlot(20250818);
      expect(result).toBe("20250817");
    });
  });

  // Note: for the following tests that use JS Date library,
  // due to historical reasons, month is 0-indexed.
  // e.g. Aug = 7, not 8

  describe("millisToDateTime", () => {
    it("converts millis to UTC DateTime", () => {
      const millis = Date.UTC(2025, 7, 18, 0, 0, 0); // Aug 18, 2025 00:00:00 UTC
      const dt = millisToDateTime(millis);
      expect(dt.toISO()).toBe("2025-08-18T00:00:00.000Z");
    });
  });

  describe("millisToHHmm", () => {
    it("formats millis to HH:mm in UTC", () => {
      const millis = Date.UTC(2025, 7, 18, 15, 30, 0); // 15:30 UTC
      expect(millisToHHmm(millis)).toBe("15:30");
    });
  });

  describe("utcDateTimeStrToTAIMillis", () => {
    it("parses string and applies TAI offset", () => {
      const result = utcDateTimeStrToTAIMillis("2025-08-18 00:00:00");
      const expected = Date.UTC(2025, 7, 18, 0, 0, 37); // with offset
      expect(result).toBe(expected);
    });
  });

  describe("utcDateTimeStrToMillis", () => {
    it("parses string to millis without TAI offset", () => {
      const result = utcDateTimeStrToMillis("2025-08-18 00:00:00");
      const expected = Date.UTC(2025, 7, 18, 0, 0, 0); // Aug = 7
      expect(result).toBe(expected);
    });
  });

  describe("dayobsAtMidnight", () => {
    it("defaults to yyyy-LL-dd format", () => {
      const dt = DateTime.fromISO("2025-08-18T00:00:00Z", { zone: "utc" });
      expect(dayobsAtMidnight(dt)).toBe("2025-08-17"); // minus 1 min = previous day
    });

    it("accepts custom format", () => {
      const dt = DateTime.fromISO("2025-08-18T00:00:00Z", { zone: "utc" });
      expect(dayobsAtMidnight(dt, "yyyyLLdd")).toBe("20250817");
    });
  });

  describe("getValidTimeRange", () => {
    const fullTimeRange = [
      getDayobsStartUTC("20250818"),
      getDayobsEndUTC("20250818"),
    ];

    it("returns start/end DateTimes if millis are valid and in range", () => {
      const startMillis =
        getDayobsStartUTC("20250818").toMillis() + 6 * 3600 * 1000; // +6h
      const endMillis =
        getDayobsStartUTC("20250818").toMillis() + 18 * 3600 * 1000; // +18h

      const result = getValidTimeRange(startMillis, endMillis, fullTimeRange);

      expect(result[0].toMillis()).toBe(startMillis);
      expect(result[1].toMillis()).toBe(endMillis);
    });

    it("returns fullTimeRange if startMillis is null", () => {
      const endMillis = fullTimeRange[1].toMillis();
      const result = getValidTimeRange(null, endMillis, fullTimeRange);
      expect(result).toEqual(fullTimeRange);
    });

    it("returns fullTimeRange if endMillis is NaN", () => {
      const startMillis = fullTimeRange[0].toMillis();
      const result = getValidTimeRange(startMillis, NaN, fullTimeRange);
      expect(result).toEqual(fullTimeRange);
    });

    it("returns fullTimeRange if times are out of range", () => {
      const startMillis = fullTimeRange[0].toMillis() - 3600 * 1000; // before range
      const endMillis = fullTimeRange[1].toMillis() + 3600 * 1000; // after range

      const result = getValidTimeRange(startMillis, endMillis, fullTimeRange);
      expect(result).toEqual(fullTimeRange);
    });

    it("returns fullTimeRange if times partially out of range", () => {
      const startMillis = fullTimeRange[0].toMillis() + 2 * 3600 * 1000; // in range
      const endMillis = fullTimeRange[1].toMillis() + 3600 * 1000; // out of range
      const result = getValidTimeRange(startMillis, endMillis, fullTimeRange);
      expect(result).toEqual(fullTimeRange);
    });
  });
});
