import { PLOT_KEY_SEQUENCE } from "@/components/PLOT_DEFINITIONS";
import { groupBy } from "@/utils/plotUtils";
import { getDayobsStartTAI, millisToHHmm } from "@/utils/timeUtils";

/**
 * Calculate all data transformations needed for chart plotting.
 * This function transforms time-series data into sequence-indexed data with
 * properly positioned ticks, moon intervals, and day observation breaks.
 *
 * @param {Object} params - Configuration object
 * @param {string} params.xAxisType - Current x-axis type (time or sequence)
 * @param {Array} params.data - Raw ungrouped data array
 * @param {Array<Array>} params.moonIntervals - Moon rise/set intervals [[start, end], ...]
 * @param {Array<string>} params.availableDayObs - List of available day observations
 * @param {number} params.selectedMinMillis - Minimum time in milliseconds for time mode
 * @param {number} params.selectedMaxMillis - Maximum time in milliseconds for time mode
 * @returns {Object} Transformed data for chart plotting
 */
export function calculateChartData({
  xAxisType,
  data,
  moonIntervals,
  availableDayObs,
  selectedMinMillis,
  selectedMaxMillis,
}) {
  // Group data by day obs and trim empty entries
  const chartData = groupBy(
    data,
    "day obs",
    new Map(availableDayObs.map((e) => [parseInt(e, 10), []])),
  );

  while (chartData.length && chartData[0].length === 0) {
    chartData.shift();
  }
  while (chartData.length && chartData.at(-1).length === 0) {
    chartData.pop();
  }

  // Calculate size of spacing between dayobs in PLOT_KEY_SEQUENCE mode
  // We use the smaller of two numbers based off the number of data points
  // or the number of dayObs, but no less than 8 (otherwise the squiggle lines overlap)
  const chartDayObsSpacing =
    chartData.length > 1
      ? Math.ceil(
          Math.max(
            8,
            Math.min(
              200 / chartData.length - 1,
              (data.length * 0.2) / chartData.length,
            ),
          ),
        )
      : 1;

  // If not in sequence mode, return grouped time data
  // Some blank things are included to ensure the return type is consistent
  if (xAxisType !== PLOT_KEY_SEQUENCE) {
    const dayObsTicks = [];
    const dayObsTickMappings = new Map();

    // Calculate dayobs ticks for time mode
    chartData.forEach((dayObsGroup, dIdx) => {
      const dayObsValue = availableDayObs[dIdx];
      // Add tick if there's data for this dayobs
      if (dayObsGroup.length > 0) {
        const dayObsStart = Math.min(
          ...dayObsGroup.map((e) => e.obs_start_millis),
        );
        const dayObsEnd = Math.max(
          ...dayObsGroup.map((e) => e.obs_start_millis),
        );
        const dayObsMidpoint = Math.floor((dayObsStart + dayObsEnd) / 2);

        dayObsTicks.push(dayObsMidpoint);
        dayObsTickMappings.set(dayObsMidpoint, dayObsValue);
      } else {
        // If theres no data, then add a dayobs tick at midnight Chile time
        const dayObsMidpoint = getDayobsStartTAI(dayObsValue).plus({
          hours: 15,
        });

        dayObsTicks.push(dayObsMidpoint);
        dayObsTickMappings.set(dayObsMidpoint, dayObsValue);
      }
    });

    return {
      chartData: chartData,
      chartMoon: moonIntervals.map(([start, end]) => ({
        start,
        end,
        startIsZigzag: false,
        endIsZigzag: false,
      })),
      chartDayObsBreaks: [],
      ticks: undefined,
      dayObsTicks,
      dayObsTickMappings,
      noDataX: [],
      fakeX: 0,
      chartDayObsSpacing,
      chartDataKey: "obs_start_millis",
      domain: [selectedMinMillis, selectedMaxMillis],
      tickFormatter: (tick) => millisToHHmm(tick),
      scale: "time",
    };
  }

  let fakeX = 0;
  const transformedChartData = [];
  const chartDayObsBreaks = [];
  const ticks = [];
  const tickMappings = new Map();
  const dayObsTicks = [];
  const dayObsTickMappings = new Map();
  const noDataX = [];
  const dayObsMetadata = [];

  chartData.forEach((dayObsGroup, dIdx) => {
    const transformedGroup = [];
    // Calculate tick size for this dayObs
    const tickSpacing = Math.ceil(Math.min(dayObsGroup.length / 6, 50));
    const dayObsStartFakeX = fakeX;

    dayObsGroup.forEach((e, i) => {
      // Create new object with fakeX property - NO MUTATION
      const entry = { ...e, fakeX };
      transformedGroup.push(entry);

      if (i % tickSpacing === 0) {
        ticks.push(fakeX);
        tickMappings.set(fakeX, entry["seq num"]);
      }

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

    const dayObsMidFakeX = Math.floor(
      (dayObsEndFakeX - dayObsStartFakeX) / 2 + dayObsStartFakeX,
    );

    // Add a tick to display the dayobs on the second x axis
    dayObsTicks.push(dayObsMidFakeX);
    dayObsTickMappings.set(dayObsMidFakeX, availableDayObs[dIdx]);

    // If there is no data for the day, add a no data reference area
    if (dayObsGroup.length === 0) {
      noDataX.push(fakeX);
      dayObsTickMappings.set(dayObsMidFakeX, "");
    }

    // After each dayobs group, add some spacing on the graph
    fakeX += chartDayObsSpacing;
    chartDayObsBreaks.push(fakeX - chartDayObsSpacing / 2);
  });

  // We don't want a daytime-like gap in the sequence at the end
  fakeX -= chartDayObsSpacing;

  // Process moon intervals after all fakeX have been assigned
  const flatData = transformedChartData.flat();
  const chartMoon = [];

  moonIntervals.forEach(([moonUp, moonDown]) => {
    // Object describing the moon ReferenceArea
    const moonObj = {
      start: 0,
      end: 0,
      startIsZigzag: false,
      endIsZigzag: false,
    };

    // Process moonUp event (index 0)
    let closestUp = null;
    let closestUpDiff = Infinity;
    flatData.forEach((entry) => {
      const diff = Math.abs(entry.obs_start_millis - moonUp);
      if (diff < closestUpDiff) {
        closestUpDiff = diff;
        closestUp = entry;
      }
    });

    if (closestUp) {
      // Check if moonUp is before first obs of a dayobs
      let isBeforeDayobs = false;
      dayObsMetadata.forEach((meta) => {
        if (
          meta.firstFakeX === closestUp.fakeX &&
          meta.firstMillis &&
          moonUp < meta.firstMillis
        ) {
          // Use the before-dayobs boundary
          moonObj.start = meta.boundaryBefore;
          moonObj.startIsZigzag = true;
          isBeforeDayobs = true;
        }
      });
      if (!isBeforeDayobs) {
        moonObj.start = closestUp.fakeX;
      }
    }

    // Process moonDown event (index 1)
    let closestDown = null;
    let closestDownDiff = Infinity;
    flatData.forEach((entry) => {
      const diff = Math.abs(entry.obs_start_millis - moonDown);
      if (diff < closestDownDiff) {
        closestDownDiff = diff;
        closestDown = entry;
      }
    });

    if (closestDown) {
      // Check if moonDown is after last obs of a dayobs
      let isAfterDayobs = false;
      dayObsMetadata.forEach((meta) => {
        if (
          meta.lastFakeX === closestDown.fakeX &&
          meta.lastMillis &&
          moonDown > meta.lastMillis
        ) {
          // use the after-dayobs bondary
          moonObj.end = meta.boundaryAfter;
          moonObj.endIsZigzag = true;
          isAfterDayobs = true;
        }
      });
      if (!isAfterDayobs) {
        moonObj.end = closestDown.fakeX;
      }
    }

    // Ensure that the edges of the graph are correct
    if (moonObj.start <= 0) {
      moonObj.startIsZigzag = false;
    }
    if (moonObj.end >= fakeX) {
      moonObj.endIsZigzag = false;
    }

    // If there the moonObj is twice the width of chartDayObsSpacing,
    // that means there is nothing in that dayobs, so don't
    // show the moon at all.
    if (moonObj.end - moonObj.start !== chartDayObsSpacing * 2 + 1) {
      chartMoon.push(moonObj);
    }
  });

  return {
    chartData: transformedChartData,
    chartMoon,
    chartDayObsBreaks,
    ticks,
    dayObsTicks,
    dayObsTickMappings,
    noDataX,
    fakeX,
    chartDayObsSpacing,
    chartDataKey: "fakeX",
    domain: [0, fakeX],
    tickFormatter: (e) => tickMappings.get(e),
    scale: "auto",
  };
}
