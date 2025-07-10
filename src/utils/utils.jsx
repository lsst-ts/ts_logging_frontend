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

function getKeyByValue(obj, value) {
  const key = Object.keys(obj).find((k) => obj[k] === value);
  return key;
}

export {
  calculateEfficiency,
  calculateTimeLoss,
  getDayobsStr,
  getDatetimeFromDayobsStr,
  getDisplayDateRange,
  getKeyByValue,
};
