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

export {
  isoToTAI,
  getDayobsStartTAI,
  getDayobsEndTAI,
  almanacDayobsForPlot,
  millisToDateTime,
  millisToHHmm,
  utcDateTimeStrToTAIMillis,
  dayobsAtMidnight,
  ISO_DATETIME_FORMAT,
  TAI_OFFSET_SECONDS,
};
