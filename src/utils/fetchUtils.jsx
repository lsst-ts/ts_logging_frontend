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
 * @throws {Error} Throws if the response is not OK. If aborted, an `AbortError` is thrown
 * and should be handled by the caller.
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
 * @returns {Promise<[Object[], number, number]>} A promise that resolves to an array containing:
 *   [0]: exposures (Object[]) - An array of exposure records with selected fields,
 *   [1]: exposures_count (number) - The number of exposures,
 *   [2]: sum_exposure_time (number) - The total exposure time.
 * @throws {error} Will throw an error if the fetch operation fails (for reasons other than an abort)
 * or returns invalid data.
 */
const fetchExposures = async (start, end, instrument, abortController) => {
  try {
    const url = `${backendLocation}/exposures?dayObsStart=${start}&dayObsEnd=${end}&instrument=${instrument}`;
    const data = await fetchData(url, abortController);
    return [
      data.exposures,
      data.exposures_count,
      data.sum_exposure_time,
      data.on_sky_exposures_count,
      data.total_on_sky_exposure_time,
    ];
  } catch (err) {
    if (err.name !== "AbortError") {
      console.error("Error fetching exposures:", err);
    }
    throw err;
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
 * @returns {Promise<any>} Resolves with the night_hours data from the Almanac API,
 * @throws {Error} Throws an error if the fetch fails or the response is invalid.
 */
const fetchAlmanac = async (start, end, abortController) => {
  const url = `${backendLocation}/almanac?dayObsStart=${start}&dayObsEnd=${end}`;
  try {
    const data = await fetchData(url, abortController);
    return data.night_hours;
  } catch (err) {
    if (err.name !== "AbortError") {
      console.error("Error fetching Almanac:", err);
    }
    throw err;
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
 * @returns {Promise<[number, number, any]>} A promise that resolves to an array:
 *   [0]: time_lost_to_weather (number),
 *   [1]: time_lost_to_faults (number),
 *   [2]: narrative_log (any).
 * @throws {Error} Throws an error if the narrative log cannot be fetched and the request was not aborted.
 */
const fetchNarrativeLog = async (start, end, instrument, abortController) => {
  const url = `${backendLocation}/narrative-log?dayObsStart=${start}&dayObsEnd=${end}&instrument=${instrument}`;
  try {
    const data = await fetchData(url, abortController);
    return [
      data.time_lost_to_weather,
      data.time_lost_to_faults,
      data.narrative_log,
    ];
  } catch (err) {
    if (err.name !== "AbortError") {
      console.error("Error fetching Narrative Log:", err);
    }
    throw err;
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
 * @returns {Promise<Object[]>} A promise that resolves to an array of objects with:
 *   - obs_id (string): The observation ID.
 *   - exposure_flag (string): The flag associated with the observation.
 *   Returns an empty array if fetching fails.
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
    if (err.name !== "AbortError") {
      console.error("Error fetching exposure flags:", err);
    }
    throw err;
  }
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
 * @returns {Promise<Array>} A promise that resolves to an array of Jira ticket issues.
 * @throws {Error} Throws an error if fetching Jira tickets fails for reasons other than an abort.
 */
const fetchJiraTickets = async (start, end, instrument, abortController) => {
  const url = `${backendLocation}/jira-tickets?dayObsStart=${start}&dayObsEnd=${end}&instrument=${instrument}`;
  try {
    const data = await fetchData(url, abortController);
    return data.issues;
  } catch (err) {
    if (err.name !== "AbortError") {
      console.error("Error fetching Jira tickets", err);
    }
    throw err;
  }
};

/**
 * Fetches data log (exposures and related data) for a given date range and instrument.
 *
 * @async
 * @function fetchDataLog
 * @param {string} start - The start date for the observation range (format: YYYY-MM-DD).
 * @param {string} end - The end date for the observation range (format: YYYY-MM-DD).
 * @param {string} instrument - The name of the instrument to filter exposures.
 * @param {AbortController} abortController - The AbortController used to cancel the request if needed.
 * @returns {Promise<Object[]>} A promise that resolves to an array containing data log records.
 * @throws {Error} Throws an error if the fetch fails or the response is invalid.
 */
const fetchDataLog = async (start, end, instrument, abortController) => {
  const url = `${backendLocation}/data-log?dayObsStart=${start}&dayObsEnd=${end}&instrument=${instrument}`;
  try {
    const data = await fetchData(url, abortController);
    if (!data) {
      throw new Error("Error fetching Data Log");
    }
    return data.issues;
  } catch (err) {
    if (err.name !== "AbortError") {
      console.error("Error fetching Data Log", err);
    }
    throw err;
  }
};

export {
  fetchExposures,
  fetchAlmanac,
  fetchNarrativeLog,
  fetchExposureFlags,
  fetchJiraTickets,
  fetchDataLog,
};
