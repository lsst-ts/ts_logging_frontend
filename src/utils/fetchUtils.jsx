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
 *   [3]: on_sky_exposures_count (number) - The count of on-sky exposures.
 *   [4]: total_on_sky_exposure_time (number) - The total on-sky exposure time.
 *   [5]: open_dome_hours (number) - The total hours the dome was open.
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
      data.open_dome_hours,
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
    return data.almanac_info;
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
 * Fetches the nightreport data for a specified date range.
 *
 * @async
 * @function fetchNightreport
 * @param {string} start - The start date for the observation range (format: YYYYMMDD).
 * @param {string} end - The end date for the observation range (format: YYYYMMDD).
 * @param {AbortController} abortController - The AbortController used to cancel the request if needed.
 * @returns {Promise<Object[]>} A promise that resolves to an array of objects with:
 *   - id (string): The report ID.
 *   - site_id (string): The site identifier.
 *   - day_obs (number): The observation date in YYYYMMDD format.
 *   - summary (string): The summary of the night report.
 *   - weather (string): The weather conditions during the night.
 *   - maintel_summary (string): The Simonyi telescope summary.
 *   - auxtel_summary (string): The Auxiliary telescope summary.
 *   - confluence_url (string): The URL to the Confluence page with the plan of the night.
 *   - user_id (string): The user ID of the person who created the report.
 *   - user_agent (string): The user agent of the person who created the report.
 *   - date_added (string): The date when the report was started.
 *   - date_sent (string): The date when the report was sent.
 *   - is_valid (boolean): Indicates if the report is valid.
 *   - parent_id (string): The ID of the parent report, if any.
 *   - observers_crew (string[]): The list of observers usernames.
 * @throws {Error} Throws an error if the night reports cannot be fetched and the request was not aborted.
 */
const fetchNightreport = async (start, end, abortController) => {
  const url = `${backendLocation}/night-reports?dayObsStart=${start}&dayObsEnd=${end}`;
  try {
    const data = await fetchData(url, abortController);
    return [data.reports];
  } catch (err) {
    if (err.name !== "AbortError") {
      console.error("Error fetching Nightreport API:", err);
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
const fetchDataLogEntriesFromConsDB = async (
  start,
  end,
  instrument,
  abortController,
) => {
  const url = `${backendLocation}/data-log?dayObsStart=${start}&dayObsEnd=${end}&instrument=${instrument}`;
  try {
    const data = await fetchData(url, abortController);
    if (!data) {
      throw new Error("Error fetching Data Log");
    }
    return data;
  } catch (err) {
    if (err.name !== "AbortError") {
      console.error("Error fetching Data Log", err);
    }
    throw err;
  }
};

/**
 * Fetches data log entries from the exposure log for a given date range and instrument.
 *
 * @async
 * @function fetchDataLogEntriesFromExposureLog
 * @param {string} start - The start date of the observation range (format: YYYY-MM-DD).
 * @param {string} end - The end date of the observation range (format: YYYY-MM-DD).
 * @param {string} instrument - The instrument to filter exposure entries.
 * @param {AbortController} abortController - The AbortController used to cancel the request if needed.
 * @returns {Promise<Object[]>} A promise that resolves to an array of exposure entry records.
 * @throws {Error} Throws an error if the fetch fails or returns invalid data and the request was not aborted.
 */
const fetchDataLogEntriesFromExposureLog = async (
  start,
  end,
  instrument,
  abortController,
) => {
  const url = `${backendLocation}/exposure-entries?dayObsStart=${start}&dayObsEnd=${end}&instrument=${instrument}`;
  try {
    const data = await fetchData(url, abortController);
    if (!data) {
      throw new Error("No data returned for exposure entries");
    }
    return data.exposure_entries;
  } catch (err) {
    if (err.name !== "AbortError") {
      console.error("Error fetching exposure entries:", err);
    }
    throw err;
  }
};

/**
 * Fetches the context feed data for a specified date range.
 *
 * @async
 * @function fetchContextFeed
 * @param {string} start - The start date for the observation range (format: YYYYMMDD).
 * @param {string} end - The end date for the observation range (format: YYYYMMDD).
 * @param {AbortController} abortController - The AbortController used to cancel the request if needed.
 * @returns {Promise<Object[]>} A promise that resolves to an array of objects with:
 *   - efd_and_messages (Pandas dataframe):  A Dataframe of relevant logging and EFD messages.
 *   - cols (string[]): The short-list of columns for display in the table.
 * @throws {Error} Throws an error if the context feed data cannot be fetched and the request was not aborted.
 */
const fetchContextFeed = async (start, end, abortController) => {
  const url = `${backendLocation}/context-feed?dayObsStart=${start}&dayObsEnd=${end}`;
  try {
    const data = await fetchData(url, abortController);
    return [data.data, data.cols];
  } catch (err) {
    if (err.name !== "AbortError") {
      console.error("Error fetching ContextFeed API:", err);
    }
    throw err;
  }
};

/**
 * Fetches the backend package version.
 *
 * @async
 * @function fetchBackendVersion
 * @param {AbortController} abortController - The AbortController used to cancel the request if needed.
 * @returns {Promise<Object[]>} A promise that resolves to an object with:
 *   - version (string):  The deployed backend (ts_logging_and_reporting) package version.
 * @throws {Error} Throws an error if the package version cannot be fetched and the request was not aborted.
 */
const fetchBackendVersion = async (abortController) => {
  const url = `${backendLocation}/version`;
  try {
    const data = await fetchData(url, abortController);
    return data.version;
  } catch (err) {
    if (err.name !== "AbortError") {
      console.error("Error fetching the backend package version:", err);
    }
    throw err;
  }
};

const fetchVisitMaps = async (
  start,
  end,
  instrument,
  planisphereOnly,
  abortController,
) => {
  const url = `${backendLocation}/multi-night-visit-maps?dayObsStart=${start}&dayObsEnd=${end}&instrument=${instrument}&planisphereOnly=${planisphereOnly}`;
  try {
    const data = await fetchData(url, abortController);
    if (!data) {
      throw new Error("No data returned for interactive visit maps");
    }
    return data.interactive;
  } catch (err) {
    if (err.name !== "AbortError") {
      console.error("Error fetching visit maps:", err);
    }
    throw err;
  }
};

const fetchSurveyProgressMap = async (end, instrument, abortController) => {
  const url = `${backendLocation}/survey-progress-map?dayObs=${end}&instrument=${instrument}`;
  try {
    const data = await fetchData(url, abortController);
    if (!data) {
      throw new Error("No data returned for survey progress map");
    }
    return data.static;
  } catch (err) {
    if (err.name !== "AbortError") {
      console.error("Error fetching survey progress map:", err);
    }
    throw err;
  }
};


export {
  fetchExposures,
  fetchAlmanac,
  fetchNarrativeLog,
  fetchNightreport,
  fetchExposureFlags,
  fetchJiraTickets,
  fetchDataLogEntriesFromConsDB,
  fetchDataLogEntriesFromExposureLog,
  fetchContextFeed,
  fetchBackendVersion,
  fetchVisitMaps,
  fetchSurveyProgressMap,
};
