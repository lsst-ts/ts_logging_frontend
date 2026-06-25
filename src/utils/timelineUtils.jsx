import {
  millisToDateTime,
  millisToHHmm,
  dayobsAtMidnight,
  utcDateTimeStrToTAIMillis,
  utcDateTimeStrToMillis,
  almanacDayobsForPlot,
} from "@/utils/timeUtils";
import {
  TIMELINE_COLORS,
  TIMELINE_DIMENSIONS,
  TIMELINE_INTERVALS,
  TIMELINE_MARGINS,
  TIMELINE_TEXT_STYLES,
} from "@/constants/TIMELINE_DEFINITIONS";

/**
 * Generate hourly ticks for the x-axis
 *
 * @param {number} startMillis - Start time in milliseconds
 * @param {number} endMillis - End time in milliseconds
 * @param {number} intervalHours - Interval between ticks in hours
 * @returns {number[]} Array of tick positions in milliseconds
 */
export const generateHourlyTicks = (
  startMillis,
  endMillis,
  intervalHours = 1,
) => {
  const ticks = [];
  let t = millisToDateTime(startMillis).startOf("hour");
  const endDt = millisToDateTime(endMillis).endOf("hour");

  while (t <= endDt) {
    ticks.push(t.toMillis());
    t = t.plus({ hours: intervalHours });
  }
  return ticks;
};

/**
 * Prepares almanac data for timeline display by extracting twilight times,
 * moon illumination values, and moon rise/set events.
 *
 * @param {Array} almanac - Array of almanac objects, each containing:
 *   - twilight_evening_12deg: UTC datetime string for evening nautical twilight (12°)
 *   - twilight_morning_12deg: UTC datetime string for morning nautical twilight (12°)
 *   - twilight_evening_0deg: UTC datetime string for evening civil twilight (0°)
 *   - twilight_morning_0deg: UTC datetime string for morning civil twilight (0°)
 *   - moon_illumination: Moon illumination percentage
 *   - moon_rise_time: UTC datetime string for moon rise
 *   - moon_set_time: UTC datetime string for moon set
 *   - dayobs: Day observation number in yyyyMMdd format
 *
 * @returns {Object} Object containing:
 *   - twilightValues: Array of 12° twilight timestamps in TAI milliseconds
 *   - twilight0DegValues: Array of 0° twilight timestamps in TAI milliseconds
 *   - illumValues: Array of {dayobs, illum} objects for moon illumination
 *   - moonValues: Array of {time, type} objects for moon rise/set events
 */
export const prepareAlmanacData = (almanac, { utc = false } = {}) => {
  const toMillis = utc ? utcDateTimeStrToMillis : utcDateTimeStrToTAIMillis;

  const twilightValues = almanac
    .map((dayobsAlm) => [
      toMillis(dayobsAlm.twilight_evening_12deg),
      toMillis(dayobsAlm.twilight_morning_12deg),
    ])
    .flat();

  const twilight0DegValues = almanac
    .map((dayobsAlm) => [
      toMillis(dayobsAlm.twilight_evening_0deg),
      toMillis(dayobsAlm.twilight_morning_0deg),
    ])
    .flat();

  const illumValues = almanac.flatMap((dayobsAlm) => [
    {
      dayobs: almanacDayobsForPlot(dayobsAlm.dayobs),
      illum: dayobsAlm.moon_illumination,
    },
  ]);

  const moonValues = almanac.flatMap((dayobsAlm) => [
    {
      time: toMillis(dayobsAlm.moon_rise_time),
      type: "rise",
    },
    {
      time: toMillis(dayobsAlm.moon_set_time),
      type: "set",
    },
  ]);

  return { twilightValues, twilight0DegValues, illumValues, moonValues };
};

/**
 * Pairs up moon rise/set events into continuous intervals for timeline display.
 * Handles edge cases where moon is already up at the start or still up at the end.
 *
 * @param {Array} events - Array of {time, type} objects where type is "rise" or "set"
 * @param {number} xMinMillis - Timeline start boundary in milliseconds
 * @param {number} xMaxMillis - Timeline end boundary in milliseconds
 *
 * @returns {Array} Array of [startMillis, endMillis] pairs representing moon-up intervals
 */
export const prepareMoonIntervals = (events, xMinMillis, xMaxMillis) => {
  if (!events?.length) return [];

  const sorted = [...events].sort((a, b) => a.time - b.time);
  const intervals = [];
  let currentStart = null;

  for (let i = 0; i < sorted.length; i++) {
    const { time, type } = sorted[i];

    if (type === "rise") {
      // If this rise is before timeline, clamp it
      currentStart = Math.max(time, xMinMillis);
    } else if (type === "set" && currentStart != null) {
      // Clamp end time to max
      intervals.push([currentStart, Math.min(time, xMaxMillis)]);
      currentStart = null;
    }
  }

  // Handle moon already up at start
  if (sorted[0].type === "set") {
    intervals.unshift([xMinMillis, Math.min(sorted[0].time, xMaxMillis)]);
  }

  // Handle moon still up at end
  const last = sorted.at(-1);
  if (last.type === "rise" && last.time < xMaxMillis) {
    intervals.push([last.time, xMaxMillis]);
  }

  return intervals;
};

/**
 * Builds the common timeline graphic elements (border lines, date labels, baseline)
 * shared by all timeline charts.
 *
 * Returns null if the chart is not yet laid out (convertToPixel not ready).
 * Otherwise returns an object with:
 *   - elements: Array of ECharts graphic element configs
 *   - containerHeight, fontFamily, gridLeft, gridRight, gridBottom: derived
 *     metrics the caller may use to append extra elements before calling
 *     instance.setOption({ graphic: elements }).
 *
 * @param {Object} instance - ECharts instance
 * @param {React.RefObject} containerRef - Ref to the chart container div
 * @param {Object} options
 * @param {[DateTime, DateTime]} options.fullTimeRange
 * @param {number} options.computedHeight - Fallback height if offsetHeight unavailable
 * @param {boolean} [options.showBaseline=false] - Add white baseline at bottom of grid
 * @returns {{ elements: Array, containerHeight: number, fontFamily: string,
 *             gridLeft: number, gridRight: number, gridBottom: number } | null}
 */
export const buildTimelineGraphicElements = (
  instance,
  containerRef,
  { fullTimeRange, computedHeight, showBaseline = false },
) => {
  const xMinMillis = fullTimeRange[0]?.toMillis();
  const xMaxMillis = fullTimeRange[1]?.toMillis();
  if (!xMinMillis || !xMaxMillis) return null;

  const gridLeft = instance.convertToPixel({ xAxisIndex: 0 }, xMinMillis);
  const gridRight = instance.convertToPixel({ xAxisIndex: 0 }, xMaxMillis);
  if (gridLeft == null || gridRight == null) return null;

  const containerHeight = containerRef.current?.offsetHeight ?? computedHeight;
  const fontFamily = getComputedStyle(containerRef.current).fontFamily;
  const gridBottom = containerHeight - TIMELINE_MARGINS.bottom;

  const hourlyTicks = generateHourlyTicks(
    xMinMillis,
    xMaxMillis + 60000,
    TIMELINE_INTERVALS.HOURLY_TICK_INTERVAL,
  );

  const elements = [];

  for (const tickMs of hourlyTicks) {
    const dt = millisToDateTime(tickMs);
    const hourUTC = dt.hour;
    const pixelX = instance.convertToPixel({ xAxisIndex: 0 }, tickMs);
    if (pixelX == null) continue;

    // UTC midday: dayobs border line
    if (hourUTC === 12) {
      elements.push({
        type: "line",
        silent: true,
        z: 0,
        shape: { x1: pixelX, y1: 0, x2: pixelX, y2: containerHeight },
        style: { stroke: TIMELINE_COLORS.DAYOBS_BORDER, lineWidth: 1 },
      });
      continue;
    }

    // UTC midnight: date label
    if (hourUTC === 0) {
      elements.push({
        type: "text",
        silent: true,
        z: 0,
        x: pixelX,
        y: gridBottom + TIMELINE_DIMENSIONS.DIST_BELOW_X_AXIS,
        style: {
          text: dayobsAtMidnight(dt, "yyyy-LL-dd"),
          textAlign: "center",
          fill: TIMELINE_COLORS.DAYOBS_LABEL,
          fontSize: TIMELINE_DIMENSIONS.LABEL_TEXT_SIZE,
          fontFamily,
          userSelect: "none",
        },
      });
      continue;
    }
  }

  // White baseline across the bottom of the grid
  if (showBaseline) {
    elements.push({
      type: "line",
      silent: true,
      z: 0,
      shape: {
        x1: gridLeft,
        y1: gridBottom,
        x2: gridRight,
        y2: gridBottom,
      },
      style: { stroke: "white", lineWidth: 1, opacity: 1 },
    });
  }

  return {
    elements,
    containerHeight,
    fontFamily,
    gridLeft,
    gridRight,
    gridBottom,
  };
};

/**
 * Builds the ECharts brush component configuration.
 * Both timeline charts use identical brush config.
 *
 * @returns {Object} ECharts brush option
 */
export const buildBrushConfig = () => ({
  toolbox: [],
  xAxisIndex: 0,
  brushType: "lineX",
  brushStyle: {
    borderColor: TIMELINE_COLORS.SELECTION_STROKE,
    color: TIMELINE_COLORS.DEFAULT_SELECTION_FILL,
    borderWidth: 1,
    opacity: 1,
  },
  inBrush: {},
  outOfBrush: {},
});

/**
 * Builds the hourly grid lines scatter series.
 *
 * @param {number[]} hourlyTicks - Tick positions in milliseconds
 * @returns {Object} ECharts series config
 */
export const buildGridLinesSeries = (hourlyTicks) => ({
  type: "scatter",
  id: "grid-lines",
  data: [],
  silent: true,
  animation: false,
  markLine: {
    silent: true,
    z: 0,
    symbol: ["none", "none"],
    lineStyle: {
      color: TIMELINE_COLORS.GRID_LINE,
      opacity: TIMELINE_COLORS.GRID_OPACITY,
      width: 1,
      type: "solid",
    },
    label: { show: false },
    data: hourlyTicks.map((tick) => ({ xAxis: tick })),
  },
});

/**
 * Builds a twilight markLine scatter series.
 *
 * @param {string} id - Series id
 * @param {number[]} values - Twilight times in milliseconds
 * @param {"solid"|"dashed"} lineType - Line style
 * @param {number} xMinMillis - Chart x-axis minimum
 * @param {number} xMaxMillis - Chart x-axis maximum
 * @param {string} [color] - Optional line color (defaults to TWILIGHT_LINE)
 * @param {number} [width] - Optional line width (defaults to TWILIGHT_STROKE_WIDTH)
 * @param {number[]} [lineDash] - Optional dash pattern [dash, gap] for dashed lines
 * @returns {Object} ECharts series config
 */
export const buildTwilightSeries = (
  id,
  values,
  type,
  xMinMillis,
  xMaxMillis,
  color = TIMELINE_COLORS.TWILIGHT_LINE,
  width = TIMELINE_COLORS.TWILIGHT_STROKE_WIDTH,
  labelText = null,
) => ({
  type: "scatter",
  id,
  data: [],
  silent: true,
  animation: false,
  markLine: values.length
    ? {
        silent: true,
        z: 0,
        symbol: ["none", "none"],
        lineStyle: {
          color,
          width,
          type,
        },
        data: values
          .filter((twi) => xMinMillis <= twi && twi <= xMaxMillis)
          .map((twi) => ({
            xAxis: twi,
            label: {
              show: true,
              formatter: labelText ?? millisToHHmm(twi),
              position: "start",
              distance: 10,
              offset: [0, TIMELINE_TEXT_STYLES.LABEL_FONT_SIZE / 2],
              rotate: 0,
              color: TIMELINE_COLORS.TWILIGHT_LABEL,
              fontSize: TIMELINE_TEXT_STYLES.LABEL_FONT_SIZE,
              fontWeight: TIMELINE_TEXT_STYLES.LABEL_FONT_WEIGHT,
              letterSpacing: TIMELINE_TEXT_STYLES.LABEL_LETTER_SPACING,
            },
          })),
      }
    : { data: [] },
});
