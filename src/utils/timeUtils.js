import { DateTime } from "luxon";

const TAI_OFFSET_SECONDS = 37;
const ISO_DATETIME_FORMAT = "yyyy-MM-dd HH:mm:ss"; // Twilight time format string

/**
 * Converts an ISO 8601 string (representing TAI time) to a Luxon DateTime object in TAI.
 *
 * Parses the string as UTC and applies the 37-second TAI offset.
 *
 * @param {string} isoStr - The ISO date-time string (e.g., "2025-08-27T12:34:56Z").
 * @returns {DateTime} A Luxon DateTime object in UTC with the TAI offset applied.
 */
const isoToTAI = (isoStr) =>
  DateTime.fromISO(isoStr, { zone: "utc" }).plus({
    seconds: TAI_OFFSET_SECONDS,
  });

/**
 * Converts an ISO 8601 string to a Luxon DateTime object in UTC.
 *
 * @param {string} isoStr - The ISO date-time string (e.g., "2025-08-27T12:34:56Z").
 * @returns {DateTime} A Luxon DateTime object in UTC.
 */
const isoToUTC = (isoStr) => DateTime.fromISO(isoStr, { zone: "utc" });

/**
 * Converts a dayobs string to the "start" boundary (12:00 noon) in TAI.
 *
 * @param {string} dayobsStr - The dayobs date string in "yyyyLLdd" format (e.g., "20250827").
 * @returns {DateTime} A Luxon DateTime object in UTC with TAI offset seconds applied.
 */
const getDayobsStartTAI = (dayobsStr) => {
  const dayobsDate = DateTime.fromFormat(dayobsStr, "yyyyLLdd", {
    zone: "utc",
  });
  return dayobsDate.set({ hour: 12, minute: 0, second: TAI_OFFSET_SECONDS });
};

/**
 * Converts a dayobs string to the "end" boundary (11:59 AM next day) in TAI.
 *
 * Each dayobs ends at midday UTC the next day, so we add a day and return that midday.
 *
 * @param {string} dayobsStr - The dayobs date string in "yyyyLLdd" format (e.g., "20250827").
 * @returns {DateTime} A Luxon DateTime object in UTC with TAI offset seconds applied.
 */
const getDayobsEndTAI = (dayobsStr) => {
  const dayobsDate = DateTime.fromFormat(dayobsStr, "yyyyLLdd", {
    zone: "utc",
  });
  return dayobsDate
    .plus({ days: 1 })
    .set({ hour: 11, minute: 59, second: TAI_OFFSET_SECONDS });
};

/**
 * Converts a dayobs string to the "start" boundary (12:00 noon) in UTC.
 *
 * @param {string} dayobsStr - The dayobs date string in "yyyyLLdd" format (e.g., "20250827").
 * @returns {DateTime} A Luxon DateTime object in UTC at 12:00:00.
 */
const getDayobsStartUTC = (dayobsStr) => {
  const dayobsDate = DateTime.fromFormat(dayobsStr, "yyyyLLdd", {
    zone: "utc",
  });
  return dayobsDate.set({ hour: 12, minute: 0, second: 0 });
};

/**
 * Converts a dayobs string to the "end" boundary (11:59:59 AM next day) in UTC.
 *
 * Each dayobs ends at midday UTC the next day, so we add a day and return that midday.
 *
 * @param {string} dayobsStr - The dayobs date string in "yyyyLLdd" format (e.g., "20250827").
 * @returns {DateTime} A Luxon DateTime object in UTC at 11:59:59 next day.
 */
const getDayobsEndUTC = (dayobsStr) => {
  const dayobsDate = DateTime.fromFormat(dayobsStr, "yyyyLLdd", {
    zone: "utc",
  });
  return dayobsDate.plus({ days: 1 }).set({ hour: 11, minute: 59, second: 59 });
};

/**
 * Adjusts an almanac-provided dayobs number to the plotting convention.
 *
 * The almanac data is offset by one day (providing data for the previous day),
 * so this function subtracts one day to align correctly.
 *
 * @param {number} dayobsNum - The dayobs date as a number in "yyyyLLdd" format (e.g., 20250827).
 * @returns {string} The adjusted dayobs string in "yyyyLLdd" format.
 */
const almanacDayobsForPlot = (dayobsNum) => {
  return (
    DateTime.fromFormat(dayobsNum.toString(), "yyyyLLdd", { zone: "utc" })
      // Decremenet one day due to almanac returning data for previous dayobs
      .minus({ days: 1 })
      .toFormat("yyyyLLdd")
  );
};

/**
 * Converts a UTC timestamp in milliseconds to a Luxon DateTime object.
 *
 * No TAI offset is applied.
 *
 * @param {number} millis - The timestamp in milliseconds since the epoch (UTC).
 * @returns {DateTime} A Luxon DateTime object in UTC.
 */
const millisToDateTime = (millis) =>
  DateTime.fromMillis(millis, { zone: "utc" });

/**
 * Converts a UTC timestamp in milliseconds to a formatted string "HH:mm".
 *
 * Used for chart tick labels to avoid local timezone effects.
 *
 * @param {number} millis - The timestamp in milliseconds since the epoch (UTC).
 * @returns {string} A time string formatted as "HH:mm" in UTC.
 */
const millisToHHmm = (millis) =>
  DateTime.fromMillis(millis, { zone: "utc" }).toFormat("HH:mm");

/**
 * Converts a UTC date-time string in "yyyy-MM-dd HH:mm:ss" format
 * to milliseconds since the epoch, applying the TAI offset.
 *
 * @param {string} dateTimeStr - The UTC date-time string (e.g., "2025-08-27 15:42:00").
 * @returns {number} The corresponding timestamp in milliseconds with TAI offset applied.
 */
const utcDateTimeStrToTAIMillis = (dateTimeStr) =>
  DateTime.fromFormat(dateTimeStr, "yyyy-MM-dd HH:mm:ss", { zone: "utc" })
    .plus({ seconds: TAI_OFFSET_SECONDS })
    .toMillis();

/**
 * Converts a UTC date-time string in "yyyy-MM-dd HH:mm:ss" format
 * to milliseconds since the epoch.
 *
 * @param {string} dateTimeStr - The UTC date-time string (e.g., "2025-08-27 15:42:00").
 * @returns {number} The corresponding timestamp in milliseconds.
 */
const utcDateTimeStrToMillis = (dateTimeStr) =>
  DateTime.fromFormat(dateTimeStr, "yyyy-MM-dd HH:mm:ss", {
    zone: "utc",
  }).toMillis();

/**
 * Converts a Luxon DateTime to a formatted dayobs string,
 * subtracting 1 minute to capture the previous day's date.
 *
 * Useful for mapping midnight boundaries into dayobs convention.
 *
 * @param {DateTime} dt - The Luxon DateTime object to convert.
 * @param {string} [format="yyyy-LL-dd"] - The format string (e.g., "yyyy-LL-dd" or "yyyyLLdd").
 * @returns {string} The formatted dayobs string.
 */
const dayobsAtMidnight = (dt, format = "yyyy-LL-dd") => {
  return dt.minus({ minutes: 1 }).toFormat(format);
};

/**
 * Validate start/end millis and convert to Luxon DateTime objects if valid.
 * Otherwise return the provided fullTimeRange.
 *
 * @param {number} startMillis
 * @param {number} endMillis
 * @param {[DateTime, DateTime]} fullTimeRange
 * @returns {[DateTime, DateTime]} start/end DateTimes
 */
function getValidTimeRange(startMillis, endMillis, fullTimeRange) {
  if (
    startMillis != null &&
    endMillis != null &&
    !Number.isNaN(startMillis) &&
    !Number.isNaN(endMillis)
  ) {
    const [fullStart, fullEnd] = fullTimeRange;
    if (
      startMillis >= fullStart.toMillis() &&
      endMillis <= fullEnd.toMillis()
    ) {
      return [millisToDateTime(startMillis), millisToDateTime(endMillis)];
    }
  }
  return fullTimeRange;
}

/**
 * Generates an array of strings representing dayObs between two dayObs (inclusive).
 * Both parameters are strings or ints in the format "yyyyMMdd"
 *
 * @param {String|Int} start - The first dayObs
 * @param {String|Int} end - The final dayObs in the range
 * @returns {[String]} - All dayObs between the two parameters, inclusive.
 */
function generateDayObsRange(start, end) {
  const startDate = DateTime.fromFormat(start.toString(), "yyyyMMdd");
  const endDate = DateTime.fromFormat(end.toString(), "yyyyMMdd");
  if (!startDate.isValid || !endDate.isValid || startDate > endDate) {
    throw new Error("Invalid dayobs passed to generateDayObsRange");
  }

  const dates = [];
  for (let d = startDate; d <= endDate; d = d.plus({ days: 1 })) {
    dates.push(d.toFormat("yyyyMMdd"));
  }
  return dates;
}

/**
 * Formats a dayobs string in a standard human-readable way
 * @param {String} dayobs - Dayobs in the format "yyyyMMdd" e.g., "20251225"
 * @returns {String} - The dayobs now in the format "2025-12-25"
 */
function formatDayobsStrForDisplay(dayobs) {
  return DateTime.fromFormat(dayobs, "yyyyLLdd", { zone: "utc" }).toFormat(
    "yyyy-LL-dd",
  );
}

export {
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
  ISO_DATETIME_FORMAT,
  TAI_OFFSET_SECONDS,
  generateDayObsRange,
  formatDayobsStrForDisplay,
};
