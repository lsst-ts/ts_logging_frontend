import { groupBy } from "@/utils/plotUtils";
import {
  formatDayobsStrForDisplay,
  getDayobsStartTAI,
  millisToHHmm,
  dayobsAtMidnight,
  millisToDateTime,
} from "@/utils/timeUtils";
import { DateTime } from "luxon";
/**
 * Helper function to find fakeX position for a moon event (moonUp or moonDown).
 * Finds the closest data point by timestamp and checks if the event occurs
 * at a dayobs boundary.
 *
 * @param {number} moonEventMillis - Moon event timestamp in milliseconds
 * @param {Array} flatData - Flattened array of all data entries with fakeX
 * @param {Array} dayObsMetadata - Metadata for each dayobs group
 * @returns {Object} Object with fakeX position and isZigzag flag
 */
function findMoonEventFakeX(moonEventMillis, flatData, dayObsMetadata) {
  // Find closest data point by timestamp
  let closestEntry = null;
  let closestDiff = Infinity;
  flatData.forEach((entry) => {
    const diff = Math.abs(entry.obs_start_millis - moonEventMillis);
    if (diff < closestDiff) {
      closestDiff = diff;
      closestEntry = entry;
    }
  });

  if (!closestEntry) {
    return { fakeX: 0, isZigzag: false };
  }

  // Check if moon event is at a dayobs boundary
  let isAtBoundary = false;
  let boundaryFakeX = closestEntry.fakeX;

  dayObsMetadata.forEach((meta) => {
    // Check if moon event is before first obs of a dayobs
    if (
      meta.firstFakeX === closestEntry.fakeX &&
      meta.firstMillis &&
      moonEventMillis < meta.firstMillis
    ) {
      boundaryFakeX = meta.boundaryBefore;
      isAtBoundary = true;
    }
    // Check if moon event is after last obs of a dayobs
    if (
      meta.lastFakeX === closestEntry.fakeX &&
      meta.lastMillis &&
      moonEventMillis > meta.lastMillis
    ) {
      boundaryFakeX = meta.boundaryAfter;
      isAtBoundary = true;
    }
  });

  return {
    fakeX: isAtBoundary ? boundaryFakeX : closestEntry.fakeX,
    isZigzag: isAtBoundary,
  };
}

function filterDayobsGroupsByTime(
  dayObsGroups,
  selectedMinMillis,
  selectedMaxMillis,
) {
  return dayObsGroups.map((dayObsGroup) => {
    return dayObsGroup.filter(
      (e) =>
        e.obs_start_dt >= selectedMinMillis &&
        e.obs_start_dt <= selectedMaxMillis,
    );
  });
}

/**
 * Transforms raw observation data into chart-ready formats for both time and sequence plotting modes.
 *
 * **Time Mode**: Plots observations at their actual TAI timestamps.
 * **Sequence Mode**: Plots observations sequentially with a synthetic "fakeX" coordinate system,
 * adding visual gaps between day-obs groups and mapping moon intervals to sequence positions.
 *
 * Key transformations performed:
 * - Groups observations by day-obs and filters by time range
 * - Assigns sequential fakeX coordinates for sequence mode
 * - Calculates day-obs spacing based on data density
 * - Maps moon intervals to both coordinate systems
 * - Generates axis ticks for both modes
 * - Identifies empty day-obs periods and boundary events
 *
 * @param {Object} params - Configuration object
 * @param {Array} params.data - Raw observation data array
 * @param {Array<Array>} params.moonIntervals - Moon rise/set intervals [[moonUp, moonDown], ...] in milliseconds (TAI)
 * @param {Array<string>} params.availableDayObs - Available day observations (e.g., ["20240101", "20240102"])
 * @param {number} params.selectedMinMillis - Start of time range in milliseconds (TAI)
 * @param {number} params.selectedMaxMillis - End of time range in milliseconds (TAI)
 * @param {Array<number>} params.twilightValues - Twilight times in milliseconds for reference lines
 *
 * @returns {Object} Chart data for both plotting modes
 * @returns {Object} returns.time - Time mode chart data (plots at actual TAI timestamps)
 * @returns {Object} returns.sequence - Sequence mode chart data (plots with synthetic fakeX coordinates)
 *
 * **Common properties (same in both modes):**
 *
 * @returns {Array<Array>} groupedData - Observations filtered to visible time range, grouped by day-obs (array of arrays), with fakeX coordinates added
 * @returns {Array} flatData - Observations filtered to visible time range, flattened (not grouped), with fakeX coordinates added
 * @returns {Array} allData - Original unfiltered dataset; not filtered by time range, not grouped, no fakeX added
 * @returns {number} chartDayObsSpacing - Calculated spacing between dayobs groups based on data density
 * @returns {Array<number>} dayObsTicks - Secondary axis tick positions for day-obs labels (values differ by mode)
 * @returns {Function} dayObsTickFormatter - Formats day-obs tick labels (e.g., "2024-01-01")
 * @returns {number} selectedMinMillis - Start of the selected time range filter in milliseconds (TAI)
 * @returns {number} selectedMaxMillis - End of the selected time range filter in milliseconds (TAI)
 *
 * **Mode-specific properties (different values or usage between time and sequence):**
 *
 * @returns {string} chartDataKey - X-axis data key: "obs_start_millis" (time mode) or "fakeX" (sequence mode)
 * @returns {Array<number>} domain - X-axis range: [selectedMinMillis, selectedMaxMillis] (time) or [0, fakeX] (sequence)
 * @returns {string} scale - Recharts scale type: "time" (time mode) or "auto" (sequence mode)
 * @returns {Array<number>|undefined} ticks - Primary axis tick positions: undefined/auto (time) or fakeX values (sequence)
 * @returns {Function} tickFormatter - Formats primary axis ticks: HH:mm format (time) or seq num (sequence)
 * @returns {Array<Object>} chartMoon - Moon rise/set intervals for reference areas: milliseconds (time) or fakeX coordinates (sequence)
 *   @returns {number} chartMoon[].start - Moon rise position
 *   @returns {number} chartMoon[].end - Moon set position
 *   @returns {boolean} chartMoon[].startIsZigzag - True if moon rise at dayobs boundary (sequence only, always false in time)
 *   @returns {boolean} chartMoon[].endIsZigzag - True if moon set at dayobs boundary (sequence only, always false in time)
 *
 * **Sequence mode only (empty/zero in time mode):**
 *
 * @returns {Array<number>} chartDayObsBreaks - fakeX positions marking dayobs boundaries for visual gaps
 * @returns {Array<number>} noDataX - fakeX positions for empty dayobs periods to show "no data" areas
 * @returns {number} fakeX - Maximum fakeX value defining the sequence domain extent
 *
 * **Time mode only (empty in sequence mode):**
 *
 * @returns {Array<number>} twilightValues - Twilight times in milliseconds for reference lines
 */
export function calculateChartData({
  data,
  moonIntervals,
  availableDayObs,
  selectedMinMillis,
  selectedMaxMillis,
  twilightValues,
}) {
  // Group all data by day_obs
  const groupedData = groupBy(
    data,
    "day_obs",
    new Map(availableDayObs.map((e) => [parseInt(e, 10), []])),
  );

  // grouped data, but only for the time period we care about
  const filteredGroupedData = filterDayobsGroupsByTime(
    groupedData,
    selectedMinMillis,
    selectedMaxMillis,
  );

  const filteredData = filteredGroupedData.flat();

  // Remove empty dayobs groups
  // We need to track the number shifted off the front of the array
  // as it is used in determining dayObsTicks
  let shiftCount = 0;
  while (filteredGroupedData.length && filteredGroupedData[0].length === 0) {
    filteredGroupedData.shift();
    shiftCount += 1;
  }

  while (
    filteredGroupedData.length &&
    filteredGroupedData.at(-1).length === 0
  ) {
    filteredGroupedData.pop();
  }

  // Calculate size of spacing between dayobs in PLOT_KEY_SEQUENCE mode
  // We use the smaller of two numbers based off the number of data points
  // or the number of dayObs, but no less than 8 (otherwise the squiggle lines overlap)
  let chartDayObsSpacing =
    filteredGroupedData.length > 1
      ? Math.ceil(
          Math.max(
            8,
            Math.min(
              200 / filteredGroupedData.length - 1,
              (filteredData.length * 0.2) / filteredGroupedData.length,
            ),
          ),
        )
      : 1;

  // We also don't want dayObsSpacing to be an odd number
  if (chartDayObsSpacing % 2) chartDayObsSpacing++;

  // Don't have the first point on the left Y axis
  let fakeX = 1;
  const transformedChartData = [];
  const chartDayObsBreaks = [];
  const noDataX = [];
  const dayObsMetadata = [];

  // Transform the data to include a fakeX value and get dayobs metadata
  filteredGroupedData.forEach((dayObsGroup) => {
    const transformedGroup = [];
    const dayObsStartFakeX = fakeX;

    dayObsGroup.forEach((e) => {
      const entry = { ...e, fakeX };
      transformedGroup.push(entry);
      fakeX++;
    });

    transformedChartData.push(transformedGroup);

    // Store metadata for this dayobs group
    const dayObsEndFakeX = fakeX;
    const boundaryBefore = dayObsStartFakeX - chartDayObsSpacing / 2;
    const boundaryAfter = fakeX + chartDayObsSpacing / 2;

    dayObsMetadata.push({
      firstFakeX: dayObsStartFakeX,
      lastFakeX: dayObsEndFakeX - 1,
      firstMillis: dayObsGroup[0]?.obs_start_millis,
      lastMillis: dayObsGroup[dayObsGroup.length - 1]?.obs_start_millis,
      boundaryBefore,
      boundaryAfter,
    });

    // If there is no data for the day, add a no data reference area
    if (dayObsGroup.length === 0) {
      noDataX.push(fakeX);
    }

    // After each dayobs group, add some spacing on the graph
    fakeX += chartDayObsSpacing;
    chartDayObsBreaks.push(fakeX - chartDayObsSpacing / 2);
  });

  // ============================================================
  // SEQUENCE MODE DATA
  // ============================================================

  // We don't want a daytime-like gap in the sequence at the end
  fakeX -= chartDayObsSpacing;

  // Process moon intervals after all fakeX have been assigned
  const flatData = transformedChartData.flat();
  const sequenceMoon = [];

  moonIntervals.forEach(([moonUp, moonDown]) => {
    // Find fakeX positions for moonUp and moonDown events
    const moonUpResult = findMoonEventFakeX(moonUp, flatData, dayObsMetadata);
    const moonDownResult = findMoonEventFakeX(
      moonDown,
      flatData,
      dayObsMetadata,
    );

    // Object describing the moon ReferenceArea
    const moonObj = {
      start: moonUpResult.fakeX,
      end: moonDownResult.fakeX,
      startIsZigzag: moonUpResult.isZigzag,
      endIsZigzag: moonDownResult.isZigzag,
    };

    // Ensure that the edges of the graph are correct
    if (moonObj.start <= 0) {
      moonObj.startIsZigzag = false;
    }
    if (moonObj.end >= fakeX) {
      moonObj.endIsZigzag = false;
    }

    // If there are no observations inside a moon interval don't
    // show it, as this means it encompasses an empty dayobs
    if (
      flatData.filter((d) => d.fakeX >= moonObj.start && d.fakeX <= moonObj.end)
        .length
    ) {
      sequenceMoon.push(moonObj);
    }
  });

  // create ticks (first X axis) and dayObsTicks (second X axis) for sequence mode
  const tickMappings = new Map();
  const ticks = [];
  const dayObsTicks = [];
  const dayObsTickMappings = new Map();
  transformedChartData.forEach((dayObsGroup, dIdx) => {
    const dayObsValue = availableDayObs[dIdx + shiftCount];
    if (dayObsGroup.length === 0) {
      // Skip empty dayobs groups in visible data
      return;
    }

    // Calculate tick spacing for this dayObs
    const tickSpacing = Math.ceil(Math.min(dayObsGroup.length / 6, 50));
    const dayObsStartFakeX = dayObsGroup[0].fakeX;
    const dayObsEndFakeX = dayObsGroup[dayObsGroup.length - 1].fakeX;

    // Add ticks for individual data points
    for (let i = 0; i < dayObsGroup.length; i += tickSpacing) {
      const entry = dayObsGroup[i];
      ticks.push(entry.fakeX);
      tickMappings.set(entry.fakeX, entry.seq_num);
    }

    // Add dayobs tick
    const dayObsMidFakeX = (dayObsEndFakeX + dayObsStartFakeX) / 2;
    dayObsTicks.push(dayObsMidFakeX);
    dayObsTickMappings.set(
      dayObsMidFakeX,
      formatDayobsStrForDisplay(dayObsValue),
    );
  });

  // If no dayobs ticks were created, add one in the middle of the domain
  if (dayObsTicks.length === 0) {
    const middleFakeX = fakeX / 2;
    const fallbackDayobs = dayobsAtMidnight(
      millisToDateTime(selectedMinMillis),
      "yyyyLLdd",
    );
    dayObsTicks.push(middleFakeX);
    dayObsTickMappings.set(
      middleFakeX,
      formatDayobsStrForDisplay(fallbackDayobs),
    );
  }

  // TIME MODE: Calculate dayObsTicks from visible data
  // Time ticks are calculated automatically
  let timeDayObsTicks = [];
  const timeDayObsTickMappings = new Map();
  filteredGroupedData.forEach((dayObsGroup, dIdx) => {
    const dayObsValue = availableDayObs[dIdx + shiftCount];
    if (dayObsGroup.length > 0) {
      // Add tick if there's data for this dayobs
      const dayObsStart = Math.min(
        ...dayObsGroup.map((e) => e.obs_start_millis),
      );
      const dayObsEnd = Math.max(...dayObsGroup.map((e) => e.obs_start_millis));
      const dayObsMidpoint = Math.floor((dayObsStart + dayObsEnd) / 2);

      timeDayObsTicks.push(dayObsMidpoint);
      timeDayObsTickMappings.set(
        dayObsMidpoint,
        formatDayobsStrForDisplay(dayObsValue),
      );
    } else {
      // If there's no data, then add a dayobs tick at midnight Chile time
      const dayObsMidpoint = getDayobsStartTAI(dayObsValue).plus({
        hours: 15,
      });

      timeDayObsTicks.push(dayObsMidpoint.toMillis());
      timeDayObsTickMappings.set(
        dayObsMidpoint,
        formatDayobsStrForDisplay(dayObsValue),
      );
    }
  });
  // Due to a quirk of recharts, we need to remove any ticks which fall
  // outside the x axis domain
  timeDayObsTicks = timeDayObsTicks.filter(
    (t) => t >= selectedMinMillis && t <= selectedMaxMillis,
  );

  // If no dayobs ticks remain after filtering, add one in the middle of the domain
  if (timeDayObsTicks.length === 0) {
    const middleMillis = (selectedMinMillis + selectedMaxMillis) / 2;
    const fallbackDayobs = dayobsAtMidnight(
      millisToDateTime(selectedMinMillis),
      "yyyyLLdd",
    );
    timeDayObsTicks.push(middleMillis);
    timeDayObsTickMappings.set(
      middleMillis,
      formatDayobsStrForDisplay(fallbackDayobs),
    );
  }

  const timeData = {
    // Common properties
    groupedData: transformedChartData,
    flatData,
    allData: data,
    chartDayObsSpacing,
    dayObsTicks: timeDayObsTicks,
    dayObsTickFormatter: (tick) => timeDayObsTickMappings.get(tick) ?? "",
    selectedMinMillis,
    selectedMaxMillis,
    // Mode-specific properties
    chartDataKey: "obs_start_millis",
    domain: [selectedMinMillis, selectedMaxMillis],
    scale: "time",
    ticks: undefined,
    tickFormatter: (tick) => millisToHHmm(tick),
    chartMoon: moonIntervals
      .map(([start, end]) => ({
        start,
        end,
        startIsZigzag: false,
        endIsZigzag: false,
      }))
      .filter(
        (m) => m.start <= selectedMaxMillis && m.end >= selectedMinMillis,
      ),
    // Sequence mode only (empty/zero in time mode)
    chartDayObsBreaks: [],
    noDataX: [],
    fakeX: 0,
    // Time mode only
    twilightValues,
  };

  const sequenceData = {
    // Common properties
    groupedData: transformedChartData,
    flatData,
    allData: data,
    chartDayObsSpacing,
    dayObsTicks,
    dayObsTickFormatter: (tick) => dayObsTickMappings.get(tick) ?? "",
    selectedMinMillis,
    selectedMaxMillis,
    // Mode-specific properties
    chartDataKey: "fakeX",
    domain: [0, fakeX],
    scale: "auto",
    ticks,
    tickFormatter: (tick) => tickMappings.get(tick) ?? "",
    chartMoon: sequenceMoon.filter((m) => m.start <= fakeX && m.end >= 0),
    // Sequence mode only
    chartDayObsBreaks,
    noDataX,
    fakeX,
    // Time mode only (empty in sequence mode)
    twilightValues: [],
  };

  return {
    time: timeData,
    sequence: sequenceData,
  };
}
