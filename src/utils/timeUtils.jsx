import { DateTime } from "luxon";

const TAI_OFFSET_SECONDS = 37;
const DAYOBS_OFFSET_HOURS = 12;

/**
 * Convert ISO string (representing TAI time) → TAI DateTime
 * Parse as UTC then add 37s offset
 */
const isoToTAI = (isoStr) =>
  DateTime.fromISO(isoStr, { zone: "utc" }).plus({
    seconds: TAI_OFFSET_SECONDS,
  });

/**
 * Convert TAI DateTime → milliseconds for internal use
 */
const taiToMillis = (taiDateTime) => taiDateTime.toMillis();

/**
 * Convert internal milliseconds → TAI DateTime
 */
const millisToTAI = (millis) =>
  DateTime.fromMillis(millis, { zone: "utc" }).plus({
    seconds: TAI_OFFSET_SECONDS,
  });

/**
 * Convert TAI DateTime → dayobs string YYYYMMDD
 * dayobs midnight = TAI midnight - 12h
 */
const taiToDayobs = (taiDateTime) =>
  taiDateTime
    .minus({ hours: DAYOBS_OFFSET_HOURS, seconds: TAI_OFFSET_SECONDS })
    .toFormat("yyyyLLdd");

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
 * Convert milliseconds (UTC timestamp) → DateTime with zone UTC (no offset applied)
 */
const millisToDateTime = (millis) =>
  DateTime.fromMillis(millis, { zone: "utc" });

/**
 * Format milliseconds → HH:mm in UTC
 * Use for chart tick formatters to avoid local timezone bleed.
 */
const millisToHHmm = (millis) =>
  DateTime.fromMillis(millis, { zone: "utc" }).toFormat("HH:mm");

export {
  isoToTAI,
  taiToMillis,
  millisToTAI,
  taiToDayobs,
  dayobsToTAI,
  millisToDateTime,
  millisToHHmm,
};
