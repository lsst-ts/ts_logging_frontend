import { describe, it, expect } from "vitest";

import { DateTime } from "luxon";
import {
  isoToTAI,
  dayobsToTAI,
  almanacDayobsForPlot,
  millisToDateTime,
  millisToHHmm,
  utcDateTimeStrToTAIMillis,
  dayobsAtMidnight,
} from "../src/utils/timeUtils";

const TAI_OFFSET_SECONDS = 37;

describe("timeUtils", () => {
  describe("isoToTAI", () => {
    it("applies the TAI offset correctly", () => {
      const dt = isoToTAI("2025-08-18T00:00:00Z");
      expect(dt.toISO()).toBe("2025-08-18T00:00:37.000Z");
    });
  });

  describe("dayobsToTAI", () => {
    it("keeps same dayobs if hour >= 12", () => {
      const dt = dayobsToTAI("20250818", 12, 0);
      expect(dt.toISO()).toBe("2025-08-18T12:00:37.000Z");
    });

    it("shifts to next day if hour < 12", () => {
      const dt = dayobsToTAI("20250818", 11, 59);
      expect(dt.toISO()).toBe("2025-08-19T11:59:37.000Z");
    });
  });

  describe("almanacDayobsForPlot", () => {
    it("subtracts one day from the input dayobs", () => {
      const result = almanacDayobsForPlot(20250818);
      expect(result).toBe("20250817");
    });
  });

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
});
