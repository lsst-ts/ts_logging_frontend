import { DateTime } from "luxon";

/**
 * Calculates the efficiency of night hours usage, accounting for exposure time and weather loss.
 *
 * @param {number} nightHours - The total number of night hours available.
 * @param {number} sumExpTime - The sum of exposure time in seconds.
 * @param {number} weatherLoss - The total time lost due to weather in seconds.
 * @returns {number} The calculated efficiency as a ratio (0 if nightHours is 0).
 */
const calculateEfficiency = (nightHours, sumExpTime, weatherLoss) => {
  let eff = 0.0;
  if (nightHours !== 0) {
    eff = (100 * sumExpTime) / (nightHours * 60 * 60 - weatherLoss);
  }
  return eff === 0 ? 0 : Math.round(eff);
};

/**
 * Calculates the total time loss and provides a breakdown of the loss due to weather and faults.
 *
 * @param {number} weatherLoss - The amount of time lost due to weather (in seconds).
 * @param {number} faultLoss - The amount of time lost due to faults (in seconds).
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
 * @param {string|number} dayObs - The observation date in YYYYMMDD format.
 * @param {string|number} seqNum - The sequence number of the observation.
 * @returns {string|null} A formatted RubinTV URL, or null if inputs are invalid.
 */
const getRubinTVUrl = (dayObs, seqNum) => {
  if (!dayObs || !seqNum) return null;

  const baseUrl = import.meta.env.VITE_EXTERNAL_INSTANCE_URL;
  if (!baseUrl) {
    console.error("VITE_EXTERNAL_INSTANCE_URL is not defined");
    return null;
  }

  const dateStr = getDatetimeFromDayobsStr(`${dayObs}`).toFormat("yyyy-MM-dd");
  return `${baseUrl}/rubintv/summit-usdf/lsstcam/event?channel_name=calexp_mosaic&date_str=${dateStr}&seq_num=${seqNum}`;
};

/**
 * Builds a navigation URL, keeping only global params when leaving data-log.
 *
 * @param {string} itemUrl - The target navigation URL.
 * @param {string} currentPath - The current pathname from router state.
 * @param {object} currentSearch - The current search params object.
 * @param {string[]} allowedParams - List of global param keys to keep.
 * @returns {string} A valid URL with only global query parameters.
 */
const buildNavItemUrl = (
  itemUrl,
  currentPath,
  currentSearch,
  allowedParams,
) => {
  if (itemUrl === "#") return "#";

  const isLeavingDataLog =
    currentPath === "/nightlydigest/data-log" &&
    itemUrl !== "/nightlydigest/data-log";

  const searchParams = new URLSearchParams();

  const keysToPreserve = isLeavingDataLog
    ? allowedParams
    : Object.keys(currentSearch);

  for (const key of keysToPreserve) {
    const value = currentSearch[key];
    if (value !== undefined) {
      if (Array.isArray(value)) {
        value.forEach((v) => searchParams.append(key, v));
      } else {
        searchParams.set(key, value);
      }
    }
  }

  const query = searchParams.toString();
  return query ? `${itemUrl}?${query}` : itemUrl;
};

export {
  calculateEfficiency,
  calculateTimeLoss,
  getDayobsStr,
  getDatetimeFromDayobsStr,
  getDisplayDateRange,
  getKeyByValue,
  formatCellValue,
  mergeDataLogSources,
  getRubinTVUrl,
  buildNavItemUrl,
};
