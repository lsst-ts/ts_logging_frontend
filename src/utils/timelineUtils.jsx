import {
  millisToDateTime,
  utcDateTimeStrToTAIMillis,
  almanacDayobsForPlot,
} from "@/utils/timeUtils";

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
