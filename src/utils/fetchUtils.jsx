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
    eff = sumExpTime / (nightHours * 60 * 60 - weatherLoss);
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
  weatherLoss = weatherLoss / 3600; // Convert seconds to hours
  faultLoss = faultLoss / 3600; // Convert seconds to hours
  let loss = weatherLoss + faultLoss;

  let timeLoss = "0 hours";
  let timeLossDetails = "(- weather; - fault)";

  if (loss > 0) {
    let weatherPercent = (weatherLoss / loss) * 100;
    let faultPercent = (faultLoss / loss) * 100;
    timeLoss = `${loss} hours`;
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
 * Asynchronously fetches JSON data from the specified URL using a GET request.
 *
 * @async
 * @function fetchData
 * @param {string} url - The endpoint URL to fetch data from.
 * @returns {Promise<Object|undefined>} The parsed JSON data if the request is successful, otherwise undefined.
 * @throws Will log an error to the console if the fetch fails or the response is not OK.
 */
const fetchData = async (url) => {
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) {
      const errorText = await res.text();
      console.error(
        `Fetch ${url} failed with status ${res.status}: ${errorText}`,
      );
      return;
    }
    const data = await res.json();
    return data;
  } catch (error) {
    console.error(`Error fetching data from ${url}`, error);
  }
};

/**
 * Fetches the count of exposures and total exposure time for a given instrument within a date range.
 *
 * @async
 * @function fetchExposures
 * @param {string} start - The start date for the observation range (format: YYYY-MM-DD).
 * @param {string} end - The end date for the observation range (format: YYYY-MM-DD).
 * @param {string} instrument - The name of the instrument to filter exposures.
 * @returns {Promise<[number, number]>} A promise that resolves to an array containing:
 *   [0]: exposures_count (number) - The number of exposures.
 *   [1]: sum_exposure_time (number) - The total exposure time.
 */
const fetchExposures = async (start, end, instrument) => {
  const url = `${backendLocation}/exposures?dayObsStart=${start}&dayObsEnd=${end}&instrument=${instrument}`;
  const data = await fetchData(url);
  if (!data) {
    console.error("Error fetching exposures");
    return [0, 0];
  }

  return [data.exposures_count, data.sum_exposure_time];
};

/**
 * Fetches the number of night hours from the Almanac API for a given date range.
 *
 * @async
 * @function fetchAlmanac
 * @param {string} start - The start date of the observation period (in YYYY-MM-DD format).
 * @param {string} end - The end date of the observation period (in YYYY-MM-DD format).
 * @returns {Promise<number>} The number of night hours for the specified range, or 0.0 if an error occurs.
 */
const fetchAlmanac = async (start, end) => {
  const url = `${backendLocation}/almanac?dayObsStart=${start}&dayObsEnd=${end}`;
  const data = await fetchData(url);

  if (!data) {
    console.error("Error fetching Almanac");
    return 0.0;
  }
  return data.night_hours;
};

/**
 * Fetches the narrative log data for a given date range and instrument.
 *
 * @async
 * @function fetchNarrativeLog
 * @param {string} start - The start date of the observation range (format: YYYY-MM-DD).
 * @param {string} end - The end date of the observation range (format: YYYY-MM-DD).
 * @param {string} instrument - The instrument identifier to filter the narrative log.
 * @returns {Promise<[number, number]>} A promise that resolves to an array containing:
 *   [time_lost_to_weather, time_lost_to_faults]. Returns [0, 0] if fetching fails.
 */
const fetchNarrativeLog = async (start, end, instrument) => {
  const url = `${backendLocation}/narrative-log?dayObsStart=${start}&dayObsEnd=${end}&instrument=${instrument}`;
  const data = await fetchData(url);

  if (!data) {
    console.error("Error fetching Narrative Log");
    return [0, 0];
  }
  return [data.time_lost_to_weather, data.time_lost_to_faults];
};

export {
  calculateEfficiency,
  calculateTimeLoss,
  fetchExposures,
  fetchAlmanac,
  fetchNarrativeLog,
};
