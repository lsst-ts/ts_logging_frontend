/**
 * Utility functions for managing data retention policies and date ranges
 * @module retentionPolicyUtils
 */
import { DateTime } from "luxon";
import { getSiteConfig } from "./utils";

/**
 * Retrieves the retention policy for the current site based on hostname.
 *
 * Fetches the site configuration and validates the retention settings.
 * If the configuration is invalid, missing, or an error occurs during retrieval,
 * returns null for retentionDays.
 *
 * @returns {{host: string, retentionDays: number|null}} An object containing:
 *   - host: The display name of the host, or the hostname if display name is unavailable
 *   - retentionDays: The number of days to retain data, or null if no valid retention policy exists
 *
 * @example
 * // With valid site config
 * getRetentionPolicy()
 * // Returns: { host: "Production Site", retentionDays: 90 }
 *
 * @example
 * // With invalid or missing config
 * getRetentionPolicy()
 * // Returns: { host: "example.com", retentionDays: null }
 *
 * @example
 * // When getSiteConfig throws an error
 * getRetentionPolicy()
 * // Returns: { host: "example.com", retentionDays: null }
 */
export const getRetentionPolicy = () => {
  const host = window.location.hostname;

  try {
    const { hostDisplayName, retentionDays } = getSiteConfig(host);
    if (
      !hostDisplayName ||
      retentionDays == null ||
      typeof retentionDays !== "number" ||
      retentionDays <= 0
    ) {
      return { host: hostDisplayName || host, retentionDays: null };
    }
    return { host: hostDisplayName, retentionDays };
  } catch {
    return { host, retentionDays: null };
  }
};

/**
 * Gets the available range of observation days based on the retention policy.
 *
 * Calculates the current dayObs (UTC minus 12 hours) and determines
 * the minimum dayObs based on the site's retention policy.
 *
 * @returns {{min: string|null, max: string, retentionDays: number|null}} An object containing:
 *   - min: The minimum dayObs in yyyyLLdd format, or null if no retention policy exists
 *   - max: The maximum (current) dayObs in yyyyLLdd format
 *   - retentionDays: The number of days to retain, or null if no retention policy exists
 *
 * @example
 * // With retention policy of 30 days
 * getAvailableDayObsRange()
 * // Returns: { min: "20231217", max: "20240116", retentionDays: 30 }
 *
 * @example
 * // Without retention policy
 * getAvailableDayObsRange()
 * // Returns: { min: null, max: "20240116", retentionDays: null }
 */
export const getAvailableDayObsRange = () => {
  const { retentionDays } = getRetentionPolicy();
  const currentDayObs = DateTime.utc()
    .minus({ hours: 12 })
    .toFormat("yyyyLLdd");

  if (retentionDays === null) {
    return { min: null, max: currentDayObs, retentionDays: null };
  }
  const maxDayObs_dt = DateTime.fromFormat(currentDayObs, "yyyyLLdd", {
    zone: "utc",
  });
  const minDayObs = maxDayObs_dt
    .minus({ days: retentionDays })
    .toFormat("yyyyLLdd");

  return {
    min: minDayObs,
    max: currentDayObs,
    retentionDays: retentionDays,
  };
};

/**
 * Checks if a given dayObs falls within the retention range.
 *
 * Compares the provided dayObs as integer against the minimum and maximum
 * dates from the current retention policy. If no retention policy exists
 * (retentionDays is null/falsy), dayobs before or equals current dayobs are valid.
 *
 * @param {number} dayobsInt - The dayObs as an integer in yyyyLLdd format
 * @returns {boolean} True if the date is within the retention range or no retention policy exists,
 *                    false if the date is outside the retention range
 *
 * @example
 * // With 30-day retention policy, current dayobs is 20240116
 * isDateInRetentionRange(20240110)
 * // Returns: true (within last 30 days)
 *
 * @example
 * isDateInRetentionRange(20231201)
 * // Returns: false (outside retention range)
 *
 * @example
 * // With no retention policy, current dayobs is 20240116
 * isDateInRetentionRange(20200101)
 * // Returns: true (all dates valid when no policy exists)
 * isDateInRetentionRange(20240120)
 * // Returns: false (after current dayobs)
 */
export const isDateInRetentionRange = (dayobsInt) => {
  const range = getAvailableDayObsRange();
  if (range.retentionDays === null) {
    if (range.max) {
      return dayobsInt <= parseInt(range.max);
    }
    return false;
  }

  return dayobsInt >= parseInt(range.min) && dayobsInt <= parseInt(range.max);
};
