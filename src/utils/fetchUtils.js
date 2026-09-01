const httpProtocol = window.location.protocol;
const host = window.location.host;

const INSTRUMENT_ENDPOINTS = [
  "data-log",
  "exposures",
  "exposure-flags",
  "exposure-entries",
  "static-visit-map",
];

const DAYOBS_ENDPOINTS = [
  "exposures",
  "expected-exposures",
  "almanac",
  "obs-status",
  "data-log",
  "exposure-flags",
];

function parseEndpointForStaticFile(url) {
  const newUrlParts = [backendLocation];
  const endpoint = url.split("?")[0].split("/").pop();
  const queryParams = new URLSearchParams(url.split("?")[1]);
  newUrlParts.push("/", endpoint);
  if (INSTRUMENT_ENDPOINTS.includes(endpoint)) {
    newUrlParts.push("/", queryParams.get("instrument"));
  }
  if (DAYOBS_ENDPOINTS.includes(endpoint)) {
    const dayObsStart = queryParams.get("dayObsStart");
    const dayObsEnd = queryParams.get("dayObsEnd");
    const fileName = `${dayObsStart}_${dayObsEnd}`;
    newUrlParts.push("/", fileName);
  }

  console.log(url, "->", newUrlParts.join(""));
  return newUrlParts.join("");
}

/**
 * The base URL for the backend API endpoints.
 *
 * Uses `VITE_BACKEND_URL` if it was set at build time, otherwise combines the
 * HTTP protocol and host of the page to form the full API root path.
 * Example: "https://example.com/nightlydigest/api"
 *
 * @type {string}
 */
const backendLocation =
  import.meta.env.VITE_BACKEND_URL ||
  `${httpProtocol}//${host}/nightlydigest/api`;

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
  const res = await fetch(parseEndpointForStaticFile(url), {
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
 * Fetch exposure data and derived night-summary metrics.
 *
 * @async
 * @function fetchExposures
 * @param {string} start - Inclusive start dayobs in `YYYYMMDD` format.
 * @param {string} end - Exclusive end dayobs in `YYYYMMDD` format.
 * @param {string} instrument - Instrument name for the backend query.
 * @param {AbortController} abortController - AbortController used to cancel the request.
 * @returns {Promise<{
 *   exposures: Object[],
 *   exposures_count: number,
 *   sum_exposure_time: number,
 *   on_sky_exposures_count: number,
 *   total_on_sky_exposure_time: number,
 *   open_dome_times: (Object[]|null),
 *   day_obs_open_dome_hours: (Object<string, Object>|null),
 *   open_dome_error: (string|null),
 *   night_on_sky_time_accounting: (Object<string, number>|null),
 *   time_accounting_error: (string|null)
 * }>} Promise resolving to the parsed exposure API response without transformation.
 * @throws {Error} Throws if the request fails and was not aborted.
 */
const fetchExposures = async (start, end, instrument, abortController) => {
  try {
    const url = `${backendLocation}/exposures?dayObsStart=${start}&dayObsEnd=${end}&instrument=${instrument}`;
    const data = await fetchData(url, abortController);
    return data;
  } catch (err) {
    if (err.name !== "AbortError") {
      console.error("Error fetching exposures:", err);
    }
    throw err;
  }
};

/**
 * Fetches expected exposure data for Simonyi for a given date range.
 *
 * @async
 * @function fetchExpectedExposures
 * @param {string} start - The start date for the observation range (format: YYYY-MM-DD).
 * @param {string} end - The end date for the observation range (format: YYYY-MM-DD).
 * @param {AbortController} abortController - The AbortController used to cancel the request if needed.
 * @returns {Promise<number>} A promise that resolves to the number of expected exposures over the full range.
 * @throws {error} Will throw an error if the fetch operation fails (for reasons other than an abort)
 * or returns invalid data.
 */
const fetchExpectedExposures = async (start, end, abortController) => {
  try {
    const url = `${backendLocation}/expected-exposures?dayObsStart=${start}&dayObsEnd=${end}`;
    const data = await fetchData(url, abortController);
    return data.sum_exposures;
  } catch (err) {
    if (err.name !== "AbortError") {
      console.error("Error fetching expected exposures:", err);
    }
    throw err;
  }
};

/**
 * Fetch almanac records for a dayobs range.
 *
 * @async
 * @function fetchAlmanac
 * @param {string} start - Inclusive start dayobs in `YYYYMMDD` format.
 * @param {string} end - Exclusive end dayobs in `YYYYMMDD` format.
 * @param {AbortController} abortController - AbortController used to cancel the request if needed.
 * @returns {Promise<Object[]>} Resolves with the `almanac_info` array from the API response.
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
    return data;
  } catch (err) {
    if (err.name !== "AbortError") {
      console.error("Error fetching Narrative Log:", err);
    }
    throw err;
  }
};

/**
 * Fetches Observatory Status data for a specified date range.
 *
 * @async
 * @function fetchObsStatusFromRubinNights
 *
 * @param {Object} options - Fetch configuration options.
 * @param {string} options.start - Start date of the observation range (format: YYYYMMDD).
 * @param {string} options.end - End date of the observation range (format: YYYYMMDD).
 * @param {boolean} [options.includeEntries=true] - Whether to include raw Observatory Status event records.
 * @param {boolean} [options.includeIntervals=false] - Whether to include computed Observatory Status intervals.
 * @param {boolean} [options.nightOnlyMetrics=true] - Whether to include daytime data in metrics.
 * @param {string[]} [options.metrics] - List of metrics to request. If omitted, the API returns no metrics.
 * @param {AbortController} options.abortController - AbortController used to cancel the request.
 *
 * @returns {Promise<Object>} A promise resolving to an object containing:
 * @returns {Object[]} [returns.entries] Raw Observatory Status event records.
 * @returns {Object[]} [returns.intervals] Computed Observatory Status intervals and related metadata.
 * @returns {Object.<string, number>} [returns.totals] Computed metric totals in hours.
 * @returns {Object.<string, Any>} [returns.availability] Data availability for observation range.
 *
 * @throws {Error} Throws if the request fails and was not aborted.
 */
const fetchObsStatusFromRubinNights = async ({
  start,
  end,
  includeEntries = true,
  includeIntervals = false,
  nightOnlyMetrics = true,
  metrics,
  abortController,
}) => {
  // Construct API url containing multiple (unique) requested metrics.
  const params = new URLSearchParams({
    dayObsStart: start,
    dayObsEnd: end,
    includeEntries: includeEntries,
    includeIntervals: includeIntervals,
    nightOnlyMetrics: nightOnlyMetrics,
  });

  // If any metrics have been requested, add to query.
  if (metrics?.length) {
    const uniqueMetrics = [...new Set(metrics)];
    uniqueMetrics.forEach((metric) => params.append("metric", metric));
  }

  const url = `${backendLocation}/obs-status?${params.toString()}`;

  try {
    const data = await fetchData(url, abortController);
    return data;
  } catch (err) {
    if (err.name !== "AbortError") {
      console.error(
        "Error fetching Observatory Status API from Rubin Nights:",
        err,
      );
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
 * @function fetchContextFeedFromRubinNights
 * @param {string} start - The start date for the observation range (format: YYYYMMDD).
 * @param {string} end - The end date for the observation range (format: YYYYMMDD).
 * @param {AbortController} abortController - The AbortController used to cancel the request if needed.
 * @returns {Promise<Object[]>} A promise that resolves to an array of objects with:
 *   - efd_and_messages (Pandas dataframe):  A Dataframe of relevant logging and EFD messages.
 *   - cols (string[]): The short-list of columns for display in the table.
 * @throws {Error} Throws an error if the context feed data cannot be fetched and the request was not aborted.
 */
const fetchContextFeedFromRubinNights = async (start, end, abortController) => {
  const url = `${backendLocation}/context-feed?dayObsStart=${start}&dayObsEnd=${end}`;
  try {
    const data = await fetchData(url, abortController);
    return [data.data, data.cols];
  } catch (err) {
    if (err.name !== "AbortError") {
      console.error("Error fetching ContextFeed API from Rubin Nights:", err);
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

/**
 * Fetches interactive visit maps generated from schedview for a given date range and instrument.
 *
 * @async
 * @function fetchVisitMaps
 * @param {string} start - The start date of the observation range (format: YYYY-MM-DD).
 * @param {string} end - The end date of the observation range (format: YYYY-MM-DD).
 * @param {string} instrument - The instrument to filter exposure entries.
 * @param {AbortController} abortController - The AbortController used to cancel the request if needed.
 * @returns {Promise<Object>} A promise that resolves to interactive visit map data.
 * @throws {Error} Throws an error if the fetch fails or returns invalid data and the request was not aborted.
 * @param {Object} options - Optional parameters.
 * @param {boolean} options.appletMode - If true, fetches data formatted for applet mode. Default is false.
 */
const fetchVisitMaps = async (
  start,
  end,
  instrument,
  abortController,
  { appletMode = false } = {},
) => {
  const url = `${backendLocation}/multi-night-visit-maps?dayObsStart=${start}&dayObsEnd=${end}&instrument=${instrument}&appletMode=${appletMode}`;
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

/**
 * Fetches the details of BLOCKs from the backend API for a specified set of keys.
 *
 * @async
 * @function fetchBlockDetails
 * @param {Array} keys - The keys for the BLOCKs.
 * @param {AbortController} abortController - The AbortController used to cancel the request if needed.
 * @returns {Promise<Object>} A promise that resolves to an object mapping BLOCK keys to their details.
 * @throws {Error} Throws an error if fetching BLOCK details fails for reasons other than an abort.
 */
const fetchBlockDetails = async (keys, abortController) => {
  // Construct API url containing multiple (unique) keys
  const params = new URLSearchParams();
  const uniqueKeys = [...new Set(keys)];
  uniqueKeys.forEach((key) => params.append("key", key));
  const url = `${backendLocation}/block-details?${params.toString()}`;
  try {
    const data = await fetchData(url, abortController);
    return data;
  } catch (err) {
    if (err.name !== "AbortError") {
      console.error("Error fetching BLOCK details", err);
    }
    throw err;
  }
};

/**
 * Converts an image payload to a data URL.
 * The image payload is expected to have a `mime_type` and `data` property, where `data` is a base64-encoded string.
 * @param {*} imagePayload
 * @returns {string|null} A data URL string if the image payload is valid, or null if the payload is falsy.
 */
const toDataUrl = (imagePayload) =>
  imagePayload
    ? `data:${imagePayload.mime_type};base64,${imagePayload.data}`
    : null;

/**
 * Fetches a static visit map for a given date range and instrument.
 *
 * @async
 * @function fetchStaticVisitMap
 * @param {string} start - The start date of the observation range (format: YYYY-MM-DD).
 * @param {string} end - The end date of the observation range (format: YYYY-MM-DD).
 * @param {string} instrument - The instrument to filter exposure entries.
 * @param {AbortController} abortController - The AbortController used to cancel the request if needed.
 * @returns {Promise<Object>} A promise that resolves to an object containing the static map URL.
 * @throws {Error} Throws an error if the fetch fails or returns invalid data and the request was not aborted.
 */
const fetchStaticVisitMap = async (start, end, instrument, abortController) => {
  const url = `${backendLocation}/static-visit-map?dayObsStart=${start}&dayObsEnd=${end}&instrument=${instrument}`;
  try {
    const data = await fetchData(url, abortController);
    return {
      staticMapUrl: toDataUrl(data.static_map),
    };
  } catch (err) {
    if (err.name !== "AbortError") {
      console.error("Error fetching static visit map:", err);
    }
    throw err;
  }
};

export {
  fetchExposures,
  fetchExpectedExposures,
  fetchAlmanac,
  fetchNarrativeLog,
  fetchObsStatusFromRubinNights,
  fetchNightreport,
  fetchExposureFlags,
  fetchJiraTickets,
  fetchDataLogEntriesFromConsDB,
  fetchDataLogEntriesFromExposureLog,
  fetchContextFeedFromRubinNights,
  fetchBackendVersion,
  fetchVisitMaps,
  fetchBlockDetails,
  fetchStaticVisitMap,
};
