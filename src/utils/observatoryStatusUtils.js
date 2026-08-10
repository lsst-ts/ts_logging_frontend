import { DateTime } from "luxon";
import {
  OBSERVATORY_STATES,
  STATUS_LABELS,
  STATUS_COLORS,
  SERIES_ORDER,
} from "@/constants/OBSERVATORY_STATUS_DEFINITIONS";
import { isoToUTC, formatDuration, getCurrentDayObs } from "@/utils/timeUtils";

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
    const end = Math.max(endMs, interval.start);
    series[stateName].push({
      start: interval.start,
      end,
      note: interval.note,
      time: interval.time,
      duration: formatDuration(end - interval.start),
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
      closeInterval(stateName, endTime);
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

/**
 * Build day-break gaps between consecutive nights for the cumulative plot.
 *
 * @param {Map} nights Night metadata keyed by dayobs.
 * @returns {Array<{start: number, end: number, gap: string}>} Day-break gap definitions.
 */
export function buildDayBreaks(nights) {
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

/**
 * Build the open-dome overlay series for each night in the cumulative plot.
 *
 * Inserts `NaN` values between nights to break the plotted line.
 *
 * @param {Map} nights Night metadata keyed by dayobs.
 * @returns {Array<[number, number]>} `[timestampMs, cumulativeOpenHours]` points.
 */
export function buildOpenDomeSeries(nights) {
  const series = [];

  // Loop through each dayobs.
  for (const night of nights.values()) {
    let cumulativeHours = 0;

    // Get current time.
    const nowMs = Date.now();

    // Get reused sunset/sunrise times.
    const { sunsetMs, sunriseMs, intervals } = night;

    // Dome did not open.
    if (!intervals || intervals.length === 0) continue;

    // Loop through each open-dome interval.
    intervals.forEach((interval, index) => {
      const openMs = isoToUTC(interval.open_time).toMillis();

      // Clip open times at sunset.
      const startMs = index === 0 ? Math.max(openMs, sunsetMs) : openMs;

      // Start of interval.
      // (This also drags the previous cumulative value
      // across any closed-dome gap.)
      series.push([startMs, cumulativeHours]);

      // If there is no close time, then the dome is currently open.
      const closeMs = interval.close_time
        ? isoToUTC(interval.close_time).toMillis()
        : null;

      // If dome currently open, set a point at the current time.
      const isCurrentlyOpen = closeMs === null;

      if (isCurrentlyOpen) {
        series.push([nowMs, cumulativeHours + interval.open_hours]);

        return;
      }

      // Clip close times at sunrise.
      const endMs = Math.min(closeMs, sunriseMs);

      // Keep track of accumulated open time.
      cumulativeHours += interval.open_hours;

      // End of interval.
      series.push([endMs, cumulativeHours]);
    });

    // Handle final interval edge cases ---
    // 1. For a completed night, the last open-dome interval
    // will have it's final value dragged to sunrise and
    // break the line across dayobs with a NaN.
    // 2. For an ongoing night that has the dome currently
    // closed, we need to drag out the last close value to
    // the current time.
    const lastInterval = intervals[intervals.length - 1];

    const isDuringCurrentNight = sunsetMs <= nowMs && nowMs < sunriseMs;
    const cutOffMs = isDuringCurrentNight ? nowMs : sunriseMs;

    if (lastInterval.close_time) {
      series.push([cutOffMs, cumulativeHours]);
      series.push([cutOffMs, NaN]);
    }
  }

  return series;
}

/**
 * Build the night-hours reference series used by the cumulative plot.
 *
 * Inserts a `NaN` value after each sunrise to create a gap between
 * consecutive nights in the plotted line.
 *
 * @param {Map} nights Night metadata keyed by dayobs.
 * @returns {Array<[number, number]>} `[timestampMs, nightHours]` points.
 */
export function buildNightHoursSeries(nights) {
  const series = [];

  for (const night of nights.values()) {
    series.push([night.sunsetMs, night.nightHours]);
    series.push([night.sunriseMs, night.nightHours]);
    series.push([night.sunriseMs, NaN]);
  }

  return series;
}

/**
 * Build cumulative state series data for each observatory state across nights.
 *
 * @param {Array} intervals Observatory status intervals for the selected range.
 * @param {Map} nights Night metadata keyed by dayobs.
 * @returns {Object<string, Array<Object>>} Series data keyed by observatory state.
 */
export function buildCumulativeStateSeries(intervals, nights) {
  // Build one output series per state.
  const stateNames = Object.keys(OBSERVATORY_STATES).filter(
    (state) => state !== "DAYTIME",
  );

  const series = Object.fromEntries(stateNames.map((state) => [state, []]));

  if (!intervals || intervals.length === 0) return {};

  // Process each night independently.
  for (const night of nights.values()) {
    const { dayObs, sunsetMs, sunriseMs } = night;

    // Running cumulative total for each state for this night.
    // Each state resets to zero at sunset.
    const cumulative = Object.fromEntries(
      stateNames.map((state) => [state, 0]),
    );

    // Find intervals that overlap this night.
    const nightIntervals = intervals.filter(
      (interval) =>
        interval.end_time_ms > sunsetMs && interval.start_time_ms < sunriseMs,
    );

    // Track whether each state was active in the previous interval.
    const wasActive = Object.fromEntries(
      stateNames.map((state) => [state, false]),
    );

    // Start all state series at zero at sunset.
    for (const state of stateNames) {
      series[state].push({
        value: [sunsetMs, 0],
        showMarker: false,
      });
    }

    // Walk intervals in chronological order.
    for (const interval of nightIntervals) {
      // Clip interval at the night boundaries.
      const clippedAtSunset = interval.start_time_ms < sunsetMs;
      const startMs = Math.max(interval.start_time_ms, sunsetMs);
      const endMs = Math.min(interval.end_time_ms, sunriseMs);

      // Ignore intervals entirely outside the night.
      if (endMs <= startMs) {
        continue;
      }

      // Recalculate duration after clipping.
      const durationHours = (endMs - startMs) / (1000 * 60 * 60);

      // Check every state independently.
      for (const state of stateNames) {
        // Was this state active during this interval?
        let isActive;

        // Handle UNKNOWN as a special case.
        if (state === "UNKNOWN") {
          isActive = interval.start_state === 0;
        } else {
          isActive = (interval.start_state & OBSERVATORY_STATES[state]) !== 0;
        }

        // Track inactive status.
        if (!isActive) {
          wasActive[state] = false;
          continue;
        }

        // State was already active but a note has been added.
        // Add a data point for a marker.
        if (wasActive[state] && interval.start_note) {
          series[state].push({
            value: [startMs, cumulative[state]],
            showMarker: true,
            status: interval.start_labels,
            time_ms: interval.start_time_ms,
            duration: endMs - startMs,
            hasNote: !!interval.start_note,
            note: interval.start_note,
            clippedAtSunset: clippedAtSunset ? true : false,
          });
        }

        // State has just become active.
        // Add a data point to anchor the end of the
        // previous flat section and the start of the
        // accumulation slope.
        if (!wasActive[state]) {
          series[state].push({
            value: [startMs, cumulative[state]],
            showMarker: true,
            status: interval.start_labels,
            time_ms: interval.start_time_ms,
            duration: endMs - startMs,
            hasNote: !!interval.start_note,
            note: interval.start_note,
            clippedAtSunset: clippedAtSunset ? true : false,
          });
        }

        // Accumulate time spent in this interval.
        cumulative[state] += durationHours;

        // End of active interval.
        series[state].push({
          value: [endMs, cumulative[state]],
          showMarker: false,
        });

        wasActive[state] = true;
      }
    }

    // Handle current night edge cases ---
    // 1. If current night is ongoing, extend final states to
    // the current time.
    // 2. If we're still in the current dayobs but it is after
    // the sunrise, and no events have been recorded since,
    // extend states to sunrise.

    // When was the most recent event?
    const lastInterval = intervals[intervals.length - 1];
    const lastEventMs = lastInterval.end_time_ms;

    const nowMs = Date.now();
    const currentDayObs = getCurrentDayObs("yyyyLLdd");

    const isCurrentDayObs = currentDayObs === dayObs;

    if (isCurrentDayObs) {
      // If an event has been recorded since sunrise,
      // treat like a completed night.
      if (lastEventMs > sunriseMs) {
        return series;
      }

      // Collect the last recorded active states here.
      const lastActive = Object.fromEntries(
        stateNames.map((state) => [state, false]),
      );

      const isDuringCurrentNight = sunsetMs <= nowMs && nowMs < sunriseMs;

      // Set cutoff time dependent on whether during the night.
      const cutOffMs = isDuringCurrentNight ? nowMs : sunriseMs;
      const extraHours = (cutOffMs - lastEventMs) / (1000 * 60 * 60);

      for (const state of stateNames) {
        // Handle UNKNOWN as a special case.
        if (state === "UNKNOWN") {
          lastActive[state] = lastInterval.end_state === 0;
        } else {
          lastActive[state] =
            (lastInterval.end_state & OBSERVATORY_STATES[state]) !== 0;
        }

        // If an event hasn't yet been recorded since sunset,
        // add a marker at sunset representing the most recent event.
        if (lastActive[state] && lastEventMs < sunsetMs) {
          series[state].push({
            value: [sunsetMs, 0],
            showMarker: true,
            status: lastInterval.start_labels,
            time_ms: lastEventMs,
            duration: nowMs - sunsetMs,
            hasNote: !!lastInterval.end_note,
            note: lastInterval.end_note,
            clippedAtSunset: true,
          });
        }

        // These are the states activated at the last recorded event (the
        // end of the last interval). We add a marker at their activation
        // point before dragging them out.
        if (lastActive[state]) {
          series[state].push({
            value: [lastEventMs, cumulative[state]],
            showMarker: true,
            status: lastInterval.end_labels,
            time_ms: lastEventMs,
            duration: nowMs - lastEventMs,
            hasNote: !!lastInterval.end_note,
            note: lastInterval.end_note,
            clippedAtSunset: false,
          });
        }

        // If the state is currently active, add extra hours to the cumulative total
        // to account for the time since the last recorded event.
        const value = cumulative[state] + (lastActive[state] ? extraHours : 0);
        series[state].push({
          value: [cutOffMs, value],
          showMarker: false,
        });

        // Break line.
        series[state].push({
          value: [cutOffMs, NaN],
          showMarker: false,
        });
      }
    } else {
      // Extend every state to sunrise.
      for (const state of stateNames) {
        series[state].push({
          value: [sunriseMs, cumulative[state]],
          showMarker: false,
        });

        // Break line before next night.
        series[state].push({
          value: [sunriseMs, NaN],
          showMarker: false,
        });
      }
    }
  }

  return series;
}

/**
 * Build a night metadata map from almanac data and open-dome intervals.
 *
 * @param {Array} almanacInfo Almanac records for each night.
 * @param {Array} [openDomeTimes=[]] Open-dome intervals to attach to each night.
 * @returns {Map} Night metadata keyed by dayobs.
 */
export function buildNightMetadataMap(almanacInfo, openDomeTimes = []) {
  const nights = new Map();

  // Create all nights from almanac data.
  for (const night of almanacInfo) {
    // TODO: (OSW-2471) Remove once almanac dayobs values are corrected.
    const correctedDayObs = Number(
      DateTime.fromFormat(String(night.dayobs), "yyyyLLdd")
        .minus({ days: 1 })
        .toFormat("yyyyLLdd"),
    );

    nights.set(correctedDayObs, {
      dayObs: correctedDayObs,
      sunsetMs: Date.parse(`${night.twilight_evening_12deg}Z`),
      sunriseMs: Date.parse(`${night.twilight_morning_12deg}Z`),
      nightHours: night.night_hours,
      intervals: [],
    });
  }

  // Add dome-open intervals.
  for (const interval of openDomeTimes) {
    const night = nights.get(interval.day_obs);

    // Ignore intervals outside the queried almanac range
    if (!night) {
      continue;
    }

    // Only include entries with dome data.
    // A current night will have open but not close time.
    if (interval.open_time) {
      night.intervals.push(interval);
    }
  }

  return nights;
}

/**
 * Assemble the data model used by the cumulative plot.
 *
 * @param {Array} almanacInfo Almanac records for the relevant nights.
 * @param {Array} intervals Observatory status intervals to plot.
 * @param {Array} openDomeTimes Open-dome intervals to overlay.
 * @returns {{
 *   breaks: Array,
 *   nightHours: Array<[number, number]>,
 *   openDomeSeries: Array<[number, number]>,
 *   stateSeries: Object<string, Array<Object>>
 * }} Data consumed by the cumulative plot component.
 */
export function buildCumulativePlotModel(
  almanacInfo,
  intervals,
  openDomeTimes,
) {
  if (!almanacInfo || almanacInfo.length === 0) return {};

  const nights = buildNightMetadataMap(almanacInfo, openDomeTimes);

  return {
    breaks: buildDayBreaks(nights),
    nightHours: buildNightHoursSeries(nights),
    openDomeSeries: buildOpenDomeSeries(nights),
    stateSeries: buildCumulativeStateSeries(intervals, nights),
  };
}
