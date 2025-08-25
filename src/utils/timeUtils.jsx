import { DateTime } from "luxon";

const TAI_OFFSET_SECONDS = 37;

/**
 * Convert ISO string (representing TAI time) → TAI DateTime
 * Parse as UTC then add 37s offset
 */
const isoToTAI = (isoStr) =>
  DateTime.fromISO(isoStr, { zone: "utc" }).plus({
    seconds: TAI_OFFSET_SECONDS,
  });

/**
 * Convert dayobs string + time (hour, minute) → TAI DateTime
 * If hour < 12, add 1 day to dayobs date
 */
const dayobsToTAI = (dayobsStr, hour, minute) => {
  let dayobsDate = DateTime.fromFormat(dayobsStr, "yyyyLLdd", { zone: "utc" });
  if (hour < 12) dayobsDate = dayobsDate.plus({ days: 1 });
  return dayobsDate.set({ hour, minute, second: TAI_OFFSET_SECONDS });
};

/**
 * Convert almanac dayobs number → adjusted dayobs string (yyyyLLdd)
 * Subtracts one day to align with almanac data offset.
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
 * Convert milliseconds (UTC timestamp) → DateTime with zone UTC (no offset applied)
 */
const millisToDateTime = (millis) =>
  DateTime.fromMillis(millis, { zone: "utc" });

/**
 * Format milliseconds → HH:mm in UTC
 * Used for chart tick formatters to avoid local timezone bleed.
 */
const millisToHHmm = (millis) =>
  DateTime.fromMillis(millis, { zone: "utc" }).toFormat("HH:mm");

/**
 * Convert a UTC date-time string in format "yyyy-MM-dd HH:mm:ss"
 * to milliseconds, applying TAI offset.
 */
const utcDateTimeStrToTAIMillis = (dateTimeStr) =>
  DateTime.fromFormat(dateTimeStr, "yyyy-MM-dd HH:mm:ss", { zone: "utc" })
    .plus({ seconds: TAI_OFFSET_SECONDS })
    .toMillis();

/**
 * Convert DateTime → formatted dayobs string
 * Subtract 1 minute to get previous day's date.
 *
 * @param {DateTime} dt - Luxon DateTime object
 * @param {string} format - Luxon format string, e.g., "yyyy-LL-dd" or "yyyyLLdd"
 * @returns {string} Formatted dayobs string
 */
const dayobsAtMidnight = (dt, format = "yyyy-LL-dd") => {
  return dt.minus({ minutes: 1 }).toFormat(format);
};

export {
  isoToTAI,
  dayobsToTAI,
  almanacDayobsForPlot,
  millisToDateTime,
  millisToHHmm,
  utcDateTimeStrToTAIMillis,
  dayobsAtMidnight,
};
