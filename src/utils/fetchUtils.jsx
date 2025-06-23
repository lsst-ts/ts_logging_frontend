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
  return eff === 0 ? 0 : eff.toFixed(2);
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
    let weatherPercent = (weatherLoss / loss) * 100;
    let faultPercent = (faultLoss / loss) * 100;
    timeLoss = `${loss.toFixed(2)} hours`;
    timeLossDetails = `(${weatherPercent}% weather; ${faultPercent}% fault)`;
  }

  return [timeLoss, timeLossDetails];
};

const httpProtocol = window.location.protocol;
const host = window.location.host;
/**
 * The base URL for the backend API endpoints.
 *
 * Combines the HTTP protocol and host to form the full API root path.
 * Example: "https://example.com/nightlydigest/api"
 *
 * @type {string}
 */
const backendLocation = `${httpProtocol}//${host}/nightlydigest/api`;

/**
 * Fetches JSON data from the specified URL using a GET request.
 *
 * @async
 * @function fetchData
 * @param {string} url - The endpoint URL to fetch data from.
 * @param {AbortController} abortController - The AbortController used to signal cancellation of the fetch.
 * @returns {Promise<any>} Resolves with the parsed JSON response data if successful.
 * @throws {Error} Throws an error if the response is not OK, with the error message from the response or a generic HTTP error message. If the fetch was aborted, an `AbortError` is thrown and should be handled by the caller.
 */
const fetchData = async (url, abortController) => {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    signal: abortController.signal,
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    const message = errBody.detail || `HTTP error ${res.status ?? "unknown"}`;
    const error = new Error(message);
    error.response = res;
    throw error;
  }
  const data = await res.json();
  return data;
};

/**
 * Fetches exposure data for a given date range and instrument.
 *
 * @async
 * @function fetchExposures
 * @param {string} start - The start date for the observation range (format: YYYY-MM-DD).
 * @param {string} end - The end date for the observation range (format: YYYY-MM-DD).
 * @param {string} instrument - The name of the instrument to filter exposures.
 * @param {AbortController} abortController - The AbortController used to cancel the request if needed.
 * @returns {Promise<[Object[], number, number] | null>} A promise that resolves to an array containing:
 *   [0]: exposures (Object[]) - An array of exposure records with selected fields,
 *   [1]: exposures_count (number) - The number of exposures,
 *   [2]: sum_exposure_time (number) - The total exposure time.
 *   Returns `null` if the request was aborted.
 * @throws Will throw an error if the fetch operation fails (for reasons other than an abort) or returns invalid data.
 */
const fetchExposures = async (start, end, instrument, abortController) => {
  try {
    const url = `${backendLocation}/exposures?dayObsStart=${start}&dayObsEnd=${end}&instrument=${instrument}`;

    const data = await fetchData(url, abortController);
    if (!data) {
      throw new Error("Error fetching exposures");
    }
    return [data.exposures, data.exposures_count, data.sum_exposure_time];
  } catch (err) {
    if (err.name === "AbortError") {
      return null;
    } else {
      console.error("Error fetching exposures:", err);
      throw err;
    }
  }
};

/**
 * Fetches night hours data from the Almanac API for a given date range.
 *
 * @async
 * @function fetchAlmanac
 * @param {string} start - The start date in YYYY-MM-DD format.
 * @param {string} end - The end date in YYYY-MM-DD format.
 * @param {AbortController} abortController - The AbortController used to cancel the request if needed.
 * @returns {Promise<any | null>} Resolves with the night_hours data from the Almanac API, , or `null` if the request was aborted.
 * @throws {Error} Throws an error if the fetch fails or the response is invalid.
 */
const fetchAlmanac = async (start, end, abortController) => {
  const url = `${backendLocation}/almanac?dayObsStart=${start}&dayObsEnd=${end}`;
  try {
    const data = await fetchData(url, abortController);
    if (!data) {
      throw new Error("Error fetching Almanac");
    }
    return data.night_hours;
  } catch (err) {
    if (err.name === "AbortError") {
      return null;
    } else {
      console.error("Error fetching Almanac:", err);
      throw err;
    }
  }
};

/**
 * Fetches the narrative log data for a specified date range and instrument.
 *
 * @async
 * @function fetchNarrativeLog
 * @param {string} start - The start date for the observation range (format: YYYY-MM-DD).
 * @param {string} end - The end date for the observation range (format: YYYY-MM-DD).
 * @param {string} instrument - The instrument identifier to filter the narrative log.
 * @param {AbortController} abortController - The AbortController used to cancel the request if needed.
 * @returns {Promise<[number, number, any] | null>} A promise that resolves to an array:
 *   [0]: time_lost_to_weather (number),
 *   [1]: time_lost_to_faults (number),
 *   [2]: narrative_log (any).
 *   Returns `null` if the request was aborted.
 * @throws {Error} Throws an error if the narrative log cannot be fetched and the request was not aborted.
 */
const fetchNarrativeLog = async (start, end, instrument, abortController) => {
  const url = `${backendLocation}/narrative-log?dayObsStart=${start}&dayObsEnd=${end}&instrument=${instrument}`;
  try {
    const data = await fetchData(url, abortController);
    if (!data) {
      throw new Error("Error fetching Narrative Log");
    }
    return [
      data.time_lost_to_weather,
      data.time_lost_to_faults,
      data.narrative_log,
    ];
  } catch (err) {
    if (err.name === "AbortError") {
      return null;
    } else {
      console.error("Error fetching Narrative Log:", err);
      throw err;
    }
  }
};

/**
 * Fetches exposure flags from the backend for a specified date range and instrument.
 *
 * @async
 * @function fetchExposureFlags
 * @param {string} start - The start date of the observation range (format: YYYY-MM-DD).
 * @param {string} end - The end date of the observation range (format: YYYY-MM-DD).
 * @param {string} instrument - The instrument to filter the exposure flags.
 * @param {AbortController} abortController - The AbortController used to cancel the request if needed.
 * @returns {Promise<Object[] | null>} A promise that resolves to an array of objects with:
 *   - obs_id (string): The observation ID.
 *   - exposure_flag (string): The flag associated with the observation.
 *   Returns an empty array if fetching fails or `null` if the request was aborted.
 * @throws {Error} Throws an error if fetching fails and the request was not aborted.
 */
const fetchExposureFlags = async (start, end, instrument, abortController) => {
  const url = `${backendLocation}/exposure-flags?dayObsStart=${start}&dayObsEnd=${end}&instrument=${instrument}`;
  try {
    const data = await fetchData(url, abortController);
    if (!data) {
      throw new Error("No data returned for exposure flags");
    }
    return data.exposure_flags;
  } catch (err) {
    if (err.name === "AbortError") {
      return null;
    } else {
      console.error("Error fetching exposure flags:", err);
      throw err;
    }
  }
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
 * Fetches Jira tickets from the backend API for a specified date range and instrument.
 *
 * @async
 * @function fetchJiraTickets
 * @param {string} start - The start date for the observation range (format: YYYY-MM-DD).
 * @param {string} end - The end date for the observation range (format: YYYY-MM-DD).
 * @param {string} instrument - The instrument name to filter Jira tickets.
 * @param {AbortController} abortController - The AbortController used to cancel the request if needed.
 * @returns {Promise<Array | null>} A promise that resolves to an array of Jira ticket issues, or `null` if the request was aborted.
 * @throws {Error} Throws an error if fetching Jira tickets fails for reasons other than an abort.
 */
const fetchJiraTickets = async (start, end, instrument, abortController) => {
  const url = `${backendLocation}/jira-tickets?dayObsStart=${start}&dayObsEnd=${end}&instrument=${instrument}`;
  try {
    const data = await fetchData(url, abortController);
    if (!data) {
      throw new Error("Error fetching Jira Tickets");
    }
    return data.issues;
  } catch (err) {
    if (err.name === "AbortError") {
      return null;
    } else {
      console.error("Error fetching Jira tickets", err);
      throw err;
    }
  }
};

export {
  calculateEfficiency,
  calculateTimeLoss,
  fetchExposures,
  fetchAlmanac,
  fetchNarrativeLog,
  fetchExposureFlags,
  getDayobsStr,
  getDatetimeFromDayobsStr,
  fetchJiraTickets,
};
