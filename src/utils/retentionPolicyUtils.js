import { DateTime } from "luxon";

/**
 * Determine retention policy based on environment
 * @returns {host: string, retentionDays: number|null}
 */
export const getRetentionPolicy = () => {
  const host = window.location.hostname;
  const envRetentionDays = import.meta.env.VITE_RETENTION_DAYS;

  if (envRetentionDays) {
    const retentionDays =
      envRetentionDays === "never" ? null : parseInt(envRetentionDays, 10);
    return { host, retentionDays };
  }

  if (host.includes("summit")) return { host, retentionDays: 30 };
  if (host.includes("tuscon") || host.includes("base"))
    return { host, retentionDays: 7 };

  return { host, retentionDays: null };
};

/**
 * Get available date range based on retention policy
 * @returns {min: DateTime|null, max: DateTime, hasRestriction: boolean, retentionDays: number|null}}
 */
export const getAvailableDayObsRange = () => {
  const { retentionDays } = getRetentionPolicy();
  const currentDayObs = DateTime.utc()
    .minus({ hours: 12 })
    .toFormat("yyyyLLdd");
  const maxDayObs = DateTime.fromFormat(currentDayObs, "yyyyLLdd", {
    zone: "utc",
  });

  if (retentionDays === null) {
    return { min: null, max: maxDayObs, hasRestriction: false };
  }
  const minDayObs = maxDayObs.minus({ days: retentionDays });

  return {
    min: minDayObs,
    max: maxDayObs,
    hasRestriction: true,
    retentionDays: retentionDays,
  };
};

/**
 * Check if a dayobs (yyyyMMdd integer) is within available range
 * @param {number} dayobsInt - Date as yyyyMMdd integer
 * @returns {boolean}
 */
export const isDateInRetentionRange = (dayobsInt) => {
  const range = getAvailableDayObsRange();
  if (!range.hasRestriction) return true;

  const dateStr = dayobsInt.toString();
  const date = DateTime.fromFormat(dateStr, "yyyyLLdd", { zone: "utc" });

  return date >= range.min && date <= range.max;
};

/**
 * Format available date range for display
 * @returns {{start: string, end: string, startDayobs: string, endDayobs: string, retentionDays: number}|null}
 */
export const getFormattedDateRange = () => {
  const range = getAvailableDayObsRange();

  if (!range.hasRestriction) return null;
  return {
    startDayObs: range.min.toFormat("yyyyMMdd"),
    endDayObs: range.max.toFormat("yyyyMMdd"),
  };
};
