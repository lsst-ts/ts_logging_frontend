import { DateTime } from "luxon";
import { TAI_OFFSET_SECONDS, ISO_DATETIME_FORMAT } from "./timeUtils";
import { GLOBAL_SEARCH_PARAMS } from "@/routes";

export const DEFAULT_EXTERNAL_INSTANCE_URL =
  "https://usdf-rsp.slac.stanford.edu";

const DEFAULT_PIXEL_SCALE_MEDIAN = 0.2; // default median pixel scale in arcsec/pixel
const PSF_SIGMA_FACTOR = 2.355; // factor for going from sigma (σ) to FWHM (2 sqrt(2 ln(2)))

/**
 * Calculates the efficiency of night hours usage, accounting for exposure time and weather loss.
 * Efficiency is defined as the ratio of total exposure time to available night hours minus weather loss.
 * If no exposures or zero exposure time, efficiency is 0.
 * If inputs are invalid (e.g., non-finite numbers, negative weather loss, 0 night hours), returns null.
 * Sum of exposure time between twilights is used if provided, otherwise total exposure time is used.
 *
 * @param {number} nightHours - The total number of night hours available.
 * @param {number} sumExpTime - The sum of exposure time in seconds.
 * @param {number} totalExpTimeBetweenTwilights - The sum of exposure time between the twilights in seconds.
 * @param {number} weatherLoss - The total time lost due to weather in hours.
 * @returns {number} The calculated efficiency as a ratio (0 if nightHours is 0).
 */
const calculateEfficiency = (
  nightHours,
  sumExpTime,
  totalExpTimeBetweenTwilights,
  weatherLoss,
) => {
  if (
    !Number.isFinite(nightHours) ||
    !Number.isFinite(weatherLoss) ||
    nightHours <= 0 ||
    weatherLoss < 0
  )
    return null;
  if (sumExpTime === 0) return 0;
  const totalExpTime = totalExpTimeBetweenTwilights ?? sumExpTime;
  return Math.round(
    (100 * totalExpTime) / ((nightHours - weatherLoss) * 60 * 60),
  );
};

/**
 * Calculates the total time loss and provides a breakdown of the loss due to weather and faults.
 *
 * @param {number} weatherLoss - The amount of time lost due to weather (in hours).
 * @param {number} faultLoss - The amount of time lost due to faults (in hours).
 * @returns {[string, string]} A tuple where the first element is the total time loss as a string (e.g., "5 seconds"),
 * and the second element is a string detailing the percentage breakdown of weather and fault losses.
 */
const calculateTimeLoss = (weatherLoss, faultLoss) => {
  let loss = weatherLoss + faultLoss;
  let timeLoss = "0 hours";
  let timeLossDetails = "(- weather; - fault)";

  if (loss > 0) {
    let weatherPercent = Math.round((weatherLoss / loss) * 100);
    let faultPercent = Math.round((faultLoss / loss) * 100);
    timeLoss = `${loss.toFixed(2)} hours`;
    timeLossDetails = `(${weatherPercent}% weather; ${faultPercent}% fault)`;
  }

  return [timeLoss, timeLossDetails];
};

/**
 * Formats a given JavaScript Date object into a string format 'yyyyLLdd' using luxon.
 *
 * @param {Date|null|undefined} date - The date to format. If null or undefined, returns an empty string.
 * @returns {string} The formatted date string, or an empty string if no date is provided.
 */
const getDayobsStr = (date) => {
  return date ? DateTime.fromJSDate(date).toFormat("yyyyLLdd") : "";
};

/**
 * Converts a date string in 'yyyyMMdd' format that is in UTC timezone
 * to a UTC DateTime object set at 12:00:00 local time.
 *
 * @param {string} dayObsStr - The date string in 'yyyyMMdd' format (e.g., '20240607').
 * @returns luxon {DateTime} The corresponding UTC DateTime object at 12:00:00.
 */
const getDatetimeFromDayobsStr = (dayObsStr) => {
  return DateTime.fromFormat(dayObsStr, "yyyyMMdd", {
    zone: "UTC",
  }).set({ hour: 12, minute: 0, second: 0 });
};

/**
 * Generates a display-friendly string representing a range of observing nights (dayobs).
 *
 * Calculates the range of dayobs based on the selected end night (`dayobs`) and the
 * number of nights to include, counting backwards. If only one night is selected,
 * returns a single dayobs string. Otherwise, returns a range in the format
 * "startDayobs - endDayobs".
 *
 * @param {Date|null|undefined} dayobs - The selected end night of the observation range (as a JavaScript Date).
 * @param {number} noOfNights - The number of observing nights to include, counting backwards from the given dayobs.
 * @returns {string} A formatted string like "20240601 - 20240603" or just "20240603" if only one night is selected.
 *                   Returns an empty string if input is invalid.
 */

const getDisplayDateRange = (dayobs, noOfNights) => {
  if (!dayobs || !noOfNights) return "";

  const dayobsDate = getDatetimeFromDayobsStr(getDayobsStr(dayobs));
  const startDate = dayobsDate.minus({ days: noOfNights - 1 });
  const startStr = startDate.toFormat("yyyyLLdd");
  const endStr = dayobsDate.toFormat("yyyyLLdd");

  return noOfNights === 1 || startStr === endStr
    ? endStr
    : `${startStr} - ${endStr}`;
};

/**
 * Returns the key in the given object that corresponds to the specified value.
 *
 * @param {Object} obj - The object to search through.
 * @param {*} value - The value to find the corresponding key for.
 * @returns {string|undefined} The key associated with the value, or undefined if not found.
 */
function getKeyByValue(obj, value) {
  const key = Object.keys(obj).find((k) => obj[k] === value);
  return key;
}

/**
 * Formats a value for table display:
 * - Returns "na" for null, undefined, or empty values.
 * - For numbers, optionally limits decimal places (default is auto-inferred).
 * - Other types are converted to strings.
 *
 * @param {*} value - The value to format.
 * @param {Object} [options={}] - Optional configuration.
 * @param {number} [options.decimals] - Fixed number of decimal places to display (overrides inference).
 * @returns {string} A display-safe formatted value.
 */
const formatCellValue = (value, options = {}) => {
  if (value === null || value === undefined || value === "") return "na";

  const { decimals } = options;

  if (typeof value === "number") {
    const precision =
      typeof decimals === "number" ? decimals : inferDecimals(value);
    return value.toFixed(precision);
  }

  return value.toString();
};

/**
 * Converts a string key into a more human-readable title.
 *
 * Capitalises the first letter of each word, preserving spaces.
 *
 * @param {string} key - The key string to convert (e.g., "exposure time").
 * @returns {string} The prettified title (e.g., "Exposure Time").
 */
const prettyTitleFromKey = (key) => {
  return key
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};

/**
 * Infers a reasonable number of decimal places for a numeric value.
 * - If it's a large or whole number, round to 0.
 * - If it's small or fractional, round to 2.
 *
 * @param {number} value - The number to evaluate.
 * @returns {number} Inferred number of decimals.
 */
const inferDecimals = (value) => {
  if (Number.isInteger(value) || Math.abs(value) >= 100) return 0;
  return 2;
};

/**
 * Merges rows from the consDB and exposure log sources.
 *
 * For each consDB row, attempts to enrich it with instrument, exposure flag,
 * and message text from the exposure log (matched via `obs_id` and `exposure name`).
 *
 * @param {Object[]} consDbRows - The array of rows from the consDB source.
 * @param {Object[]} exposureLogRows - The array of rows from the exposure log source.
 * @returns {Object[]} A new array of merged row objects with added/enriched fields.
 */
const mergeDataLogSources = (consDbRows, exposureLogRows) => {
  const exposureLogMap = new Map();
  exposureLogRows.forEach((entry) => {
    exposureLogMap.set(entry.obs_id, entry);
  });

  return consDbRows.map((row) => {
    const exposureName = row["exposure name"];
    const matchingRow = exposureLogMap.get(exposureName);

    return {
      ...row,
      instrument: matchingRow?.instrument ?? row.instrument ?? "na",
      exposure_flag: matchingRow?.exposure_flag ?? "none",
      message_text: matchingRow?.message_text ?? "",
    };
  });
};

/**
 * Generates a RubinTV URL based on dayObs and seqNum values.
 *
 * @param {string} telescope - The telescope; either "Simonyi" or "AuxTel".
 * @param {string|number} dayObs - The observation date in YYYYMMDD format.
 * @param {string|number} seqNum - The sequence number of the observation.
 * @returns {string|null} A formatted RubinTV URL, or null if inputs are invalid.
 */
const getRubinTVUrl = (telescope, dayObs, seqNum) => {
  if (!dayObs || !seqNum) return null;

  // Set url params based on telescope
  const instr = telescope === "Simonyi" ? "lsstcam" : "auxtel";
  const channel = telescope === "Simonyi" ? "focal_plane_mosaic" : "monitor";

  // Local development URL
  let baseUrl = DEFAULT_EXTERNAL_INSTANCE_URL;

  // Production URL
  if (window.location.host !== "localhost") {
    baseUrl = window.location.origin;
  }

  const dateStr = getDatetimeFromDayobsStr(`${dayObs}`).toFormat("yyyy-MM-dd");
  return `${baseUrl}/rubintv/summit-usdf/${instr}/event?channel_name=${channel}&date_str=${dateStr}&seq_num=${seqNum}`;
};

/**
 * Build navigation target with filtered search parameters.
 * Returns an object suitable for TanStack Router navigation with Link component.
 *
 * @param {string} to - The destination URL path.
 * @param {string} currentPath - The current URL path.
 * @param {object} currentSearch - The current search params object.
 * @param {string[]} allowedParams - List of param keys to preserve (defaults to GLOBAL_SEARCH_PARAMS).
 * @returns {Object} Object with `to` (path) and `search` (filtered params object).
 */
const buildNavigationWithSearchParams = (
  to,
  from,
  currentSearch,
  allowedParams = GLOBAL_SEARCH_PARAMS,
) => {
  const search = {};
  for (const key of allowedParams) {
    const value = currentSearch[key];
    if (value !== undefined) {
      search[key] = value;
    }
  }

  return { to, from, search };
};

/**
 * Generate the Scheduler night summary link info for a given dayobs.
 *
 * @param {string} dayobs - Dayobs string in "yyyyLLdd" format.
 * @returns {{ url: string, label: string }} Object containing the URL and display label.
 */
const getNightSummaryLink = (dayobs) => {
  const dt = DateTime.fromFormat(dayobs, "yyyyLLdd");
  const pathFormat = dt.toFormat("yyyy/LL/dd");
  const label = dt.toFormat("yyyy-LL-dd");
  const url = `https://s3df.slac.stanford.edu/data/rubin/sim-data/schedview/reports/nightsum/lsstcam/${pathFormat}/nightsum_${label}.html`;

  return { url, label };
};

/* Retrieves the almanac information for a given dayobs date, correcting for a known
 * one-day offset between almanac dayobs and exposure dayobs.
 *
 * The function searches through the provided almanacInfo array, subtracts one day from each
 * almanac dayobs entry to align with the exposure dayobs, and returns the matching almanac record.
 *
 * @param {string} dayobs - The exposure dayobs date string in 'yyyyLLdd' format.
 * @param {Array<Object>} almanacInfo - Array of almanac records, each containing a 'dayobs' property
 * and twilight times in iso format.
 * @returns {Object|null} The matching almanac record for the given dayobs, or null if not found.
 */
const getDayobsAlmanac = (dayobs, almanacInfo) => {
  if (almanacInfo?.length) {
    for (const dayObsAlm of almanacInfo) {
      // minus one day from almanac dayobs to match the exposure dayobs
      // to fix the issue with almanac dayobs being one day ahead
      if (!dayObsAlm || !dayObsAlm.dayobs) continue;
      let actualAlmDayobs = "";
      try {
        actualAlmDayobs = DateTime.fromFormat(
          String(dayObsAlm.dayobs),
          "yyyyLLdd",
        )
          .minus({ days: 1 })
          .toFormat("yyyyLLdd");
      } catch (e) {
        // i.e. if time isn't the right format
        console.error(e);
        continue;
      }
      if (actualAlmDayobs === dayobs) return dayObsAlm;
    }
  }
  return null;
};

/**
 * Calculate the total exposure time that starts between evening and morning twilights.
 *
 * For each `day_obs`, this function looks up its corresponding twilight times
 * from `almanacInfo`. It then sums the exposure times (`exp_time`) of exposures
 * whose start time (`obs_start`) falls between that night's evening twilight
 * and the following morning's twilight.
 *
 *
 * @param {Array<Object>} exposureFields - Array of exposure records.
 *   Each record should contain:
 *     - {string} day_obs: the observing date key
 *     - {string} obs_start: ISO date string of exposure start
 *     - {string|number} exp_time: exposure duration in seconds
 *
 * @param {Array<Object>} almanacInfo - Array of almanac records.
 *   Each record should contain:
 *     - {string} dayobs: the observing date key
 *     - {string} twilight_evening: ISO date string of evening twilight
 *     - {string} twilight_morning: ISO date string of next morning twilight
 *
 * @returns {number} Total exposure time (seconds) for all exposures that start
 *   between their corresponding evening and morning twilights.
 */
const calculateSumExpTimeBetweenTwilights = (exposureFields, almanacInfo) => {
  if (!exposureFields?.length || !almanacInfo?.length) return 0;
  const expsGroupedByDayobs = Object.groupBy(
    exposureFields,
    (exp) => exp.day_obs,
  );
  let totalExpTime = 0;

  for (const [dayobs, exps] of Object.entries(expsGroupedByDayobs)) {
    const dayobsAlm = getDayobsAlmanac(dayobs, almanacInfo);
    if (
      !dayobsAlm ||
      !dayobsAlm.twilight_evening ||
      !dayobsAlm.twilight_morning
    ) {
      // almanac for dayobs doesn't exist or doesn't have twilight data in it.
      continue;
    }
    const groupExpTime = exps.reduce((sum, exposure) => {
      const eveningTwilight = DateTime.fromFormat(
        dayobsAlm.twilight_evening,
        ISO_DATETIME_FORMAT,
        { zone: "utc" },
      ).plus({ seconds: TAI_OFFSET_SECONDS }); // apply TAI offset to match obs_start TAI time
      const morningTwilight = DateTime.fromFormat(
        dayobsAlm.twilight_morning,
        ISO_DATETIME_FORMAT,
        { zone: "utc" },
      ).plus(
        { seconds: TAI_OFFSET_SECONDS }, // apply TAI offset to match obs_start TAI time
      );

      const expTime = parseFloat(exposure["exp_time"]);
      const expObsStart = DateTime.fromISO(exposure["obs_start"], {
        zone: "utc",
      });
      if (
        exposure.can_see_sky &&
        expObsStart >= eveningTwilight &&
        expObsStart <= morningTwilight
      ) {
        return sum + (isNaN(expTime) ? 0 : expTime);
      }
      return sum;
    }, 0);
    totalExpTime += groupExpTime;
  }
  return totalExpTime;
};

/**
 * Function used to parse the backend version string
 * to a git tag in order to include in the release notes link.
 *
 * @param {string} versionString The version string returned by the backend
 * Example version strings and their conversions:
 * - "1.2.3" -> "1.2.3"
 * - "1.2.3a1" -> "1.2.3-alpha.1"
 * - "1.2.3rc1" -> "1.2.3-rc.1"
 * @returns The git tag corresponding to the version string
 * or "main" if the version string is unrecognized
 */
function parseBackendVersion(versionString) {
  const defaultVersion = "main";
  const match = versionString.match(/^(\d+\.\d+\.\d+)([a-z]\d+|rc\d+)?$/);
  if (!match) {
    console.warn(`Unrecognized version string: ${versionString}`);
    return defaultVersion;
  }
  const baseVersion = match[1];
  const suffix = match[2];
  if (!suffix) {
    return `${baseVersion}`;
  }
  const suffixMatch = suffix.match(/^([a-z]+)(\d+)$/);
  if (!suffixMatch) {
    console.warn(`Invalid version suffix: ${suffix}`);
    return defaultVersion;
  }
  let suffixType = "";
  if (suffixMatch[1] !== "a" && suffixMatch[1] !== "rc") {
    console.warn(`Unknown version suffix type: ${suffixMatch[1]}`);
    return defaultVersion;
  }
  if (suffixMatch[1] == "a") {
    suffixType = "alpha";
  } else if (suffixMatch[1] == "rc") {
    suffixType = "rc";
  }
  const suffixNumber = suffixMatch[2];
  return `${baseVersion}-${suffixType}.${suffixNumber}`;
}

export {
  calculateEfficiency,
  calculateTimeLoss,
  getDayobsStr,
  getDatetimeFromDayobsStr,
  getDisplayDateRange,
  getKeyByValue,
  formatCellValue,
  prettyTitleFromKey,
  mergeDataLogSources,
  getRubinTVUrl,
  buildNavigationWithSearchParams,
  getNightSummaryLink,
  DEFAULT_PIXEL_SCALE_MEDIAN,
  PSF_SIGMA_FACTOR,
  ISO_DATETIME_FORMAT,
  getDayobsAlmanac,
  calculateSumExpTimeBetweenTwilights,
  parseBackendVersion,
};
