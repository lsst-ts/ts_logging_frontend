import { DateTime } from "luxon";
import {
  OBSERVATORY_STATES,
  STATUS_LABELS,
  STATUS_COLORS,
  SERIES_ORDER,
} from "@/constants/OBSERVATORY_STATUS_DEFINITIONS";
import { formatDuration } from "@/utils/timeUtils";

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
