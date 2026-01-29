import {
  millisToDateTime,
  dayobsAtMidnight,
  utcDateTimeStrToTAIMillis,
  almanacDayobsForPlot,
} from "@/utils/timeUtils";
import {
  TIMELINE_DIMENSIONS,
  TIMELINE_COLORS,
  TIMELINE_TEXT_STYLES,
  TIMELINE_Y_DOMAIN,
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
 * Calculate Y-axis domain based on data indices and series type
 *
 * @param {Array<{index: number}>} data - Data series array
 * @param {boolean} isSingleSeries - Whether this is a single series chart
 * @returns {[number, number]} Y-axis domain [min, max]
 */
export const calculateYDomain = (data, isSingleSeries) => {
  const indices = data.map((d) => d.index);
  const minIndex = Math.min(...indices);
  const maxIndex = Math.max(...indices);

  if (isSingleSeries) {
    return [
      minIndex - TIMELINE_Y_DOMAIN.SINGLE_SERIES_PADDING,
      maxIndex + TIMELINE_Y_DOMAIN.SINGLE_SERIES_PADDING,
    ];
  } else {
    return [
      TIMELINE_Y_DOMAIN.MULTI_SERIES_MIN,
      Math.max(
        maxIndex + TIMELINE_Y_DOMAIN.SINGLE_SERIES_PADDING,
        TIMELINE_Y_DOMAIN.MULTI_SERIES_MIN_MAX,
      ),
    ];
  }
};

/**
 * Create a tick renderer function for dayobs labels, borders, and moon illumination
 *
 * @param {number} computedHeight - Height of the chart
 * @param {boolean} showMoonIllumination - Whether to show moon illumination labels
 * @param {Array<{dayobs: string, illum: string}>} illumValues - Moon illumination values
 * @returns {Function} Tick renderer function compatible with Recharts
 */
export const createDayobsTickRenderer = (
  computedHeight,
  showMoonIllumination,
  illumValues,
) => {
  return ({ x, y, payload }) => {
    const value = payload.value;
    const dt = millisToDateTime(value);

    const hourUTC = dt.hour;
    const isMiddayUTC = hourUTC === 12;
    const isMidnightUTC = hourUTC === 0;

    // Lines at midday dayobs borders
    if (isMiddayUTC) {
      return (
        <line
          x1={x}
          y1={y - computedHeight + TIMELINE_DIMENSIONS.DIST_BELOW_X_AXIS}
          x2={x}
          y2={y + TIMELINE_DIMENSIONS.DIST_BELOW_X_AXIS}
          stroke={TIMELINE_COLORS.DAYOBS_BORDER}
        />
      );
    }

    // Dayobs labels
    if (isMidnightUTC) {
      const dayobsLabel = dayobsAtMidnight(dt, "yyyy-LL-dd");

      return (
        <>
          <text
            x={x}
            y={y + TIMELINE_DIMENSIONS.DIST_BELOW_X_AXIS}
            fontSize={TIMELINE_DIMENSIONS.LABEL_TEXT_SIZE}
            textAnchor="middle"
            fill={TIMELINE_COLORS.DAYOBS_LABEL}
            style={{ WebkitUserSelect: "none", userSelect: "none" }}
          >
            {dayobsLabel}
          </text>
        </>
      );
    }

    // Moon illumination labels
    if (showMoonIllumination) {
      const dtChile = dt.setZone("America/Santiago");
      const isMidnightChile = dtChile.hour === 0;

      if (isMidnightChile) {
        const dayobs = dayobsAtMidnight(dtChile, "yyyyLLdd");
        const illumEntry = illumValues.find((entry) => entry.dayobs === dayobs);
        const illumLabel = illumEntry?.illum ?? null;

        return (
          <>
            {illumLabel && (
              <>
                {/* Moon symbol */}
                <g
                  transform={`translate(${x - TIMELINE_DIMENSIONS.X_OFFSET}, ${
                    y -
                    TIMELINE_DIMENSIONS.DIST_FROM_X_AXIS -
                    TIMELINE_DIMENSIONS.MOON_RADIUS
                  })`}
                >
                  <circle
                    cx={0}
                    cy={0}
                    r={TIMELINE_DIMENSIONS.MOON_RADIUS}
                    fill={TIMELINE_COLORS.MOON_SYMBOL_LIGHT}
                  />
                  <circle
                    cx={TIMELINE_DIMENSIONS.MOON_RADIUS / 2}
                    cy={-TIMELINE_DIMENSIONS.MOON_RADIUS / 2}
                    r={TIMELINE_DIMENSIONS.MOON_RADIUS}
                    fill={TIMELINE_COLORS.MOON_SYMBOL_DARK}
                  />
                </g>
                {/* Illumination value */}
                <text
                  x={x + TIMELINE_DIMENSIONS.X_OFFSET}
                  y={y - TIMELINE_DIMENSIONS.DIST_FROM_X_AXIS}
                  fontSize={TIMELINE_TEXT_STYLES.LABEL_FONT_SIZE}
                  fontWeight={TIMELINE_TEXT_STYLES.LABEL_FONT_WEIGHT}
                  letterSpacing={TIMELINE_TEXT_STYLES.LABEL_LETTER_SPACING}
                  fill={TIMELINE_COLORS.MOON_LABEL}
                  textAnchor="left"
                  style={{ userSelect: "none" }}
                >
                  {illumLabel}
                </text>
              </>
            )}
          </>
        );
      }
    }

    return null;
  };
};

/**
 * Prepares almanac data for timeline display by extracting twilight times,
 * moon illumination values, and moon rise/set events.
 *
 * @param {Array} almanac - Array of almanac objects, each containing:
 *   - twilight_evening: UTC datetime string for evening twilight
 *   - twilight_morning: UTC datetime string for morning twilight
 *   - moon_illumination: Moon illumination percentage
 *   - moon_rise_time: UTC datetime string for moon rise
 *   - moon_set_time: UTC datetime string for moon set
 *   - dayobs: Day observation number in yyyyMMdd format
 *
 * @returns {Object} Object containing:
 *   - twilightValues: Array of twilight timestamps in TAI milliseconds
 *   - illumValues: Array of {dayobs, illum} objects for moon illumination
 *   - moonValues: Array of {time, type} objects for moon rise/set events
 */
export const prepareAlmanacData = (almanac) => {
  const twilightValues = almanac
    .map((dayobsAlm) => [
      utcDateTimeStrToTAIMillis(dayobsAlm.twilight_evening),
      utcDateTimeStrToTAIMillis(dayobsAlm.twilight_morning),
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
      time: utcDateTimeStrToTAIMillis(dayobsAlm.moon_rise_time),
      type: "rise",
    },
    {
      time: utcDateTimeStrToTAIMillis(dayobsAlm.moon_set_time),
      type: "set",
    },
  ]);

  return { twilightValues, illumValues, moonValues };
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
