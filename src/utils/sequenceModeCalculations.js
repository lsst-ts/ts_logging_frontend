import { PLOT_KEY_SEQUENCE } from "@/components/PLOT_DEFINITIONS";
import { groupBy } from "@/utils/plotUtils";

/**
 * Calculate all data transformations needed for sequence mode plotting.
 * This function transforms time-series data into sequence-indexed data with
 * properly positioned ticks, moon intervals, and day observation breaks.
 *
 * @param {Object} params - Configuration object
 * @param {string} params.xAxisType - Current x-axis type (time or sequence)
 * @param {Array} params.data - Raw ungrouped data array
 * @param {Array<Array>} params.moonIntervals - Moon rise/set intervals [[start, end], ...]
 * @param {Array<string>} params.availableDayObs - List of available day observations
 * @returns {Object} Transformed data for sequence mode plotting
 */
export function calculateSequenceModeData({
  xAxisType,
  data,
  moonIntervals,
  availableDayObs,
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

  // If not in sequence mode, return defaults with grouped data
  if (xAxisType !== PLOT_KEY_SEQUENCE) {
    return {
      chartData: chartData,
      chartMoon: moonIntervals,
      chartDayObsBreaks: [],
      ticks: [],
      tickMappings: new Map(),
      dayObsTicks: [],
      dayObsTickMappings: new Map(),
      noDataX: [],
      fakeX: 0,
      chartDayObsSpacing,
    };
  }

  let fakeX = 0;
  const transformedChartData = [];
  const chartMoon = [];
  const chartDayObsBreaks = [];
  const ticks = [];
  const tickMappings = new Map();
  const dayObsTicks = [];
  const dayObsTickMappings = new Map();
  const noDataX = [];

  let moonUp = 0;
  let moonIdx = 0;

  chartData.forEach((dayObsGroup, dIdx) => {
    const transformedGroup = [];
    // Calculate tick size for this dayObs
    const tickSpacing = Math.ceil(Math.min(dayObsGroup.length / 6, 50));
    const dayObsStartFakeX = fakeX;

    dayObsGroup.forEach((e, i) => {
      // Create new object with fakeX property - NO MUTATION
      const entry = { ...e, fakeX };
      transformedGroup.push(entry);

      // We use while instead of if here to handle the case where
      // the interval is contained within consecutive data elements e.g., between dayobs
      while (
        moonIntervals[moonIdx] &&
        entry.obs_start_millis > moonIntervals[moonIdx][moonUp]
      ) {
        if (!moonUp) {
          chartMoon.push([]);
        }
        if (i === 0) {
          // If the moon event occurred before the start of this dayobs
          // place the start in the middle of the spacing
          chartMoon[moonIdx].push(fakeX - chartDayObsSpacing / 2);
        } else {
          chartMoon[moonIdx].push(fakeX);
        }
        if (moonUp) {
          moonIdx++;
        }
        moonUp = moonUp ? 0 : 1;
      }

      if (i % tickSpacing === 0) {
        ticks.push(fakeX);
        tickMappings.set(fakeX, entry["seq num"]);
      }

      fakeX++;
    });

    transformedChartData.push(transformedGroup);

    const dayObsEndFakeX = fakeX;
    const dayObsMidFakeX = Math.floor(
      (dayObsEndFakeX - dayObsStartFakeX) / 2 + dayObsStartFakeX,
    );

    // Add a tick to display the dayobs on the second x axis
    dayObsTicks.push(dayObsMidFakeX);
    dayObsTickMappings.set(dayObsMidFakeX, availableDayObs[dIdx]);

    // If there is no data for the day, add a NO DATA label
    if (dayObsGroup.length === 0) {
      noDataX.push(fakeX);
    }

    // After each dayobs group, add some spacing on the graph
    fakeX += chartDayObsSpacing;
    chartDayObsBreaks.push(fakeX - chartDayObsSpacing / 2);
  });

  // Close the moon if required (and other sentences for the utterly deranged)
  if (chartMoon.length && chartMoon.at(-1).length < 2) {
    chartMoon.at(-1).push(fakeX);
  }
  // We don't want a daytime-like gap in the sequence at the end
  fakeX -= chartDayObsSpacing;

  return {
    chartData: transformedChartData,
    chartMoon,
    chartDayObsBreaks,
    ticks,
    tickMappings,
    dayObsTicks,
    dayObsTickMappings,
    noDataX,
    fakeX,
    chartDayObsSpacing,
  };
}
