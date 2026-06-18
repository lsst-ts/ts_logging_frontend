import { DateTime } from "luxon";
import {
  OBSERVATORY_STATES,
  STATUS_LABELS,
  STATUS_COLORS,
  SERIES_ORDER,
} from "@/constants/OBSERVATORY_STATUS_DEFINITIONS";
import { formatDuration, isoToUTC } from "@/utils/timeUtils";

/**
 * Determines the state change description (Old > New format) for a given entry.
 * Shows all active states before and after the transition, separated by pipes.
 *
 * @param {Array} entries - All status entries
 * @param {number} entryIndex - Index of the current entry
 * @returns {string} State change description in "State1 | State2 > NewState1 | NewState2" format
 */
export function getStateChangeDescription(entries, entryIndex) {
  if (entryIndex > 0) {
    const prevEntry = entries[entryIndex - 1];
    const currEntry = entries[entryIndex];

    const beforeStr = statusBitmaskToString(prevEntry.status);
    const afterStr = statusBitmaskToString(currEntry.status);

    return `${beforeStr} > ${afterStr}`;
  }

  // First entry - no previous state to compare
  const currEntry = entries[entryIndex];
  const afterStr = statusBitmaskToString(currEntry.status);

  return `> ${afterStr}`;
}

/**
 * Transforms raw observatory status entries into series data for rendering.
 *
 * Converts status change events into continuous intervals for each state.
 * Each state gets its own array of intervals showing when that state was active.
 *
 * @param {Array} entries - Array of status entries from API, sorted by time:
 *   [{ time: string, status: number, note: string, statusLabels: string, time_ms: number }]
 * @param {number} endTime - End time of the visible range (to close final intervals)
 * @returns {Object} Object with state names as keys and arrays of intervals as values:
 *   {
 *     UNKNOWN: [{ start, end, note, time }],
 *     DAYTIME: [{ start, end, note, time }],
 *     ...
 *   }
 */
export function transformStatusToSeries(entries, endTime) {
  const series = {};
  for (const stateName of SERIES_ORDER) {
    series[stateName] = [];
  }

  if (!entries || entries.length === 0) return series;

  const activeIntervals = {};

  const isStateActive = (status, stateName) =>
    stateName === "UNKNOWN"
      ? status === 0
      : !!(status & OBSERVATORY_STATES[stateName]);

  const closeInterval = (stateName, endMs) => {
    const interval = activeIntervals[stateName];
    if (!interval) return;
    series[stateName].push({
      start: interval.start,
      end: endMs,
      note: interval.note,
      time: interval.time,
      duration: formatDuration(endMs - interval.start),
      stateChange: interval.stateChange,
    });
    delete activeIntervals[stateName];
  };

  const openInterval = (stateName, entry, i) => {
    activeIntervals[stateName] = {
      start: entry.time_ms,
      note: entry.note || "",
      time: entry.time,
      stateChange: getStateChangeDescription(entries, i),
    };
  };

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const T = entry.time_ms;
    const prevStatus = i > 0 ? entries[i - 1].status : null;
    const currStatus = entry.status;

    if (prevStatus === null) {
      // First entry: open intervals for all initially active states
      for (const stateName of SERIES_ORDER) {
        if (isStateActive(currStatus, stateName)) {
          openInterval(stateName, entry, i);
        }
      }
      continue;
    }

    // Determine the nature of this transition
    const anyEnded = SERIES_ORDER.some(
      (s) => isStateActive(prevStatus, s) && !isStateActive(currStatus, s),
    );
    const statusUnchanged = prevStatus === currStatus;

    for (const stateName of SERIES_ORDER) {
      const wasActive = isStateActive(prevStatus, stateName);
      const nowActive = isStateActive(currStatus, stateName);

      if (wasActive && !nowActive) {
        // State ended: close interval, no new marker here
        closeInterval(stateName, T);
      } else if (!wasActive && nowActive) {
        // State newly active: open interval (marker at start)
        openInterval(stateName, entry, i);
      } else if (
        wasActive &&
        nowActive &&
        (anyEnded || (statusUnchanged && entry.note))
      ) {
        // State continues, but something else changed or status is identical with a note:
        // split the interval to place a marker at this transition point
        closeInterval(stateName, T);
        openInterval(stateName, entry, i);
      }
      // else: state continues with nothing significant — keep interval as-is
    }
  }

  // Close any still-open intervals at the end of the visible range
  for (const stateName of SERIES_ORDER) {
    if (activeIntervals[stateName]) {
      const interval = activeIntervals[stateName];
      series[stateName].push({
        start: interval.start,
        end: endTime,
        note: interval.note,
        time: interval.time,
        duration: formatDuration(endTime - interval.start),
        stateChange: interval.stateChange,
      });
    }
  }

  return series;
}

/**
 * Gets the color for a given state name.
 *
 * @param {string} stateName - Name of the state (e.g., "DAYTIME", "FAULT")
 * @returns {string} Hex color string
 */
export function getStatusColor(stateName) {
  return STATUS_COLORS[stateName] || STATUS_COLORS.UNKNOWN;
}

/**
 * Gets the label for a given state name.
 *
 * @param {string} stateName - Name of the state
 * @returns {string} Human-readable label
 */
export function getStatusLabel(stateName) {
  return STATUS_LABELS[stateName] || stateName;
}

/**
 * Gets the bit value for a given state name.
 *
 * @param {string} stateName - Name of the state
 * @returns {number} Bitmask value
 */
export function getStateBitValue(stateName) {
  return OBSERVATORY_STATES[stateName] || 0;
}

/**
 * Parses a status bitmask into an array of active state names.
 *
 * @param {number} status - Bitmask status value
 * @returns {string[]} Array of active state names (UPPERCASE)
 */
export function parseStatusBitmask(status) {
  const activeStates = [];
  for (const [stateName, bitValue] of Object.entries(OBSERVATORY_STATES)) {
    if (stateName === "UNKNOWN") continue; // UNKNOWN is 0, skip
    if (status & bitValue) {
      activeStates.push(stateName);
    }
  }
  return activeStates;
}

/**
 * Converts a status bitmask to a human-readable string.
 *
 * @param {number} status - Bitmask status value
 * @returns {string} Human-readable status string (e.g., "Unknown", "Daytime | Operational")
 */
export function statusBitmaskToString(status) {
  const states = parseStatusBitmask(status);
  if (states.length === 0) {
    return "Unknown";
  }
  return states.map((s) => STATUS_LABELS[s] || s).join(" | ");
}

/**
 * Formats a time string for tooltip display.
 *
 * @param {string} timeStr - UTC datetime string (e.g., "2026-01-01 12:00:00")
 * @returns {string} Formatted time string
 */
export function formatTimeForTooltip(timeStr) {
  const dt = DateTime.fromFormat(timeStr, "yyyy-MM-dd HH:mm:ss", {
    zone: "utc",
  });
  return dt.toFormat("HH:mm:ss");
}

function buildDayBreaks(nights) {
  // console.log("buildDayBreaks called.");

  const DAY_BREAK_GAP = "2%";
  const dayBreaks = [];

  const nightsArray = [...nights.values()];

  for (let i = 0; i < nightsArray.length - 1; i++) {
    dayBreaks.push({
      start: nightsArray[i].sunriseMs,
      end: nightsArray[i + 1].sunsetMs,
      gap: DAY_BREAK_GAP,
    });
  }

  return dayBreaks;
}

function buildOpenDomeSeries(nights) {
  const series = [];

  // Loop through each dayobs.
  for (const night of nights.values()) {
    let cumulativeHours = 0;

    // Get reused sunset/sunrise times.
    const { sunsetMs, sunriseMs, intervals } = night;

    // Loop through each open-dome interval.
    intervals.forEach((interval, index) => {
      const openMs = isoToUTC(interval.open_time).toMillis();
      const closeMs = isoToUTC(interval.close_time).toMillis();

      // Clip open times at sunset.
      const startMs =
        index === 0
          ? Math.max(openMs, sunsetMs)
          : openMs;

      // Start of interval.
      // (This also drags the previous cumulative value
      // across any closed-dome gap.)
      series.push([startMs, cumulativeHours]);

      // For a current night, we might not have a closed time.
      const isCurrentlyOpen = !interval.close_time;

      // Derive open_hours at current time.
      if (isCurrentlyOpen) {
        series.push([
          Date.now(),
          cumulativeHours + interval.open_hours,
        ]);

        return;
      }

      // Clip close times at sunrise.
      const endMs = Math.min(closeMs, sunriseMs);

      // Keep track of accumulated open time.
      cumulativeHours += interval.open_hours;

      // End of interval.
      series.push([endMs, cumulativeHours]);
    });

    // For a completed night, the last open-dome interval
    // will have it's final value dragged to sunrise and
    // break the line across dayobs with a NaN.
    const lastInterval = intervals[intervals.length - 1];

    if (lastInterval.close_time) {
      series.push([sunriseMs, cumulativeHours]);
      series.push([sunriseMs, NaN]);
    }
  }

  return series;
}

function buildNightHoursSeries(nights) {
  const series = [];

  for (const night of nights.values()) {
    series.push([night.sunsetMs, night.nightHours]);
    series.push([night.sunriseMs, night.nightHours]);
    series.push([night.sunriseMs, NaN]);
  }

  return series;
}

function buildCumulativeStateSeries(intervals, nights) {

  // Build one output series per state.
  const stateNames = Object.keys(OBSERVATORY_STATES).filter(
    (state) => state !== "DAYTIME",
  );

  const series = Object.fromEntries(
    stateNames.map((state) => [state, []]),
  );

  // Process each night independently.
  for (const night of nights.values()) {
    const { sunsetMs, sunriseMs } = night;

    // Running cumulative total for each state for this night.
    // Each state resets to zero at sunset.
    const cumulative = Object.fromEntries(
      stateNames.map((state) => [state, 0]),
    );

    // Find intervals that overlap this night.
    const nightIntervals = intervals.filter(
      (interval) =>
        interval.end_time_ms > sunsetMs &&
        interval.start_time_ms < sunriseMs
    );

    // Track whether each state was active in the previous interval.
    const wasActive = Object.fromEntries(
      stateNames.map((state) => [state, false]),
    );

    // Start all state series at zero at sunset.
    for (const state of stateNames) {
      series[state].push([sunsetMs, 0]);
    }

    // Walk intervals in chronological order.
    for (const interval of nightIntervals) {
      // Clip interval at the night boundaries.
      const startMs = Math.max(
        interval.start_time_ms,
        sunsetMs
      );

      const endMs = Math.min(
        interval.end_time_ms,
        sunriseMs
      );

      // Ignore intervals entirely outside the night.
      if (endMs <= startMs) {
        continue;
      }

      // Recalculate duration after clipping.
      // TODO: (OSW-2444) store in ms until the end?
      const durationHours =
        (endMs - startMs) / (1000 * 60 * 60);

      // Check every state independently.
      for (const state of stateNames) {
        // Was this state active during this interval?
        let isActive;

        // Handle UNKNOWN as a special case.
        if (state === "UNKNOWN") {
          isActive = interval.start_state === 0;
        } else {
          isActive =
            (interval.start_state &
              OBSERVATORY_STATES[state]) !== 0;
        }

        // Track inactive status.
        if (!isActive) {
          wasActive[state] = false;
          continue;
        }

        // State has just become active.
        // Add a data point to anchor the end of the
        // previous flat section and the start of the
        // accumulation slope.
        if (!wasActive[state]) {
          series[state].push([
            startMs,
            cumulative[state],
          ]);
        }

        // Accumulate time spent in this interval.
        cumulative[state] += durationHours;

        // End of active interval.
        series[state].push([
          endMs,
          cumulative[state],
        ]);

        wasActive[state] = true;
      }
    }

    // Extend every state to sunrise.
    for (const state of stateNames) {
      series[state].push([
        sunriseMs,
        cumulative[state],
      ]);

      // Break line before next night.
      series[state].push([
        sunriseMs,
        NaN,
      ]);
    }
  }

  return series;
}

function buildDayObsMap(openDomeTimes) {
  const nights = new Map();

  for (const interval of openDomeTimes) {
    // Filter out any intervals empty of dome data.
    if (!interval.open_time) {
      break;
    }

    const dayObs = interval.day_obs;

    if (!nights.has(dayObs)) {
      nights.set(dayObs, {
        dayObs,
        sunsetMs: Date.parse(`${interval.sunset12}Z`),
        sunriseMs: Date.parse(`${interval.sunrise12}Z`),
        nightHours: interval.night_hours,
        intervals: [],
      });
    }

    nights.get(dayObs).intervals.push(interval);
  }

  return nights;
}

// TODO: (OSW-2444) this needs to use query start/end dayobs
// for dayobs builder so we don't rely too heavily on open-dome
// times. Also, this currently will filter out days fully closed!
export function buildCumulativePlotModel(
  intervals,
  openDomeTimes,
  availability,
) {
  if (!openDomeTimes || openDomeTimes.length === 0) return {};
  if (!intervals || intervals.length === 0) return {};

  const nights = buildDayObsMap(openDomeTimes);
  // console.log("nights: ", nights);

  return {
    breaks: buildDayBreaks(nights),
    nightHours: buildNightHoursSeries(nights),
    stateSeries: buildCumulativeStateSeries(intervals, nights),
    // TODO: (OSW-2444) Build markers
    // markerSeries: buildMarkerSeries(intervals, nights),
    openDomeSeries: buildOpenDomeSeries(nights),
  };
}
