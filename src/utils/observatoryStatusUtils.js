import { DateTime } from "luxon";
import {
  OBSERVATORY_STATES,
  STATUS_LABELS,
  STATUS_COLORS,
  SERIES_ORDER,
} from "@/constants/OBSERVATORY_STATUS_DEFINITIONS";

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
  // Initialize empty arrays for each state
  const series = {};
  for (const stateName of SERIES_ORDER) {
    series[stateName] = [];
  }

  if (!entries || entries.length === 0) {
    return series;
  }

  // Track the start time and metadata for each currently active state
  const activeIntervals = {};

  // Process each entry
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const currentTime = entry.time_ms;

    // For each state, check if it's active in this entry's status
    for (const stateName of SERIES_ORDER) {
      const bitValue = OBSERVATORY_STATES[stateName];
      const isActive = entry.status & bitValue;

      // UNKNOWN is special: it's active when NO bits are set (status === 0)
      const isUnknownState = stateName === "UNKNOWN";
      const stateIsActuallyActive = isUnknownState
        ? entry.status === 0
        : isActive;

      if (stateIsActuallyActive) {
        // State is active
        if (!activeIntervals[stateName]) {
          // Just became active - record the start
          activeIntervals[stateName] = {
            start: currentTime,
            note: entry.note || "",
            time: entry.time,
          };
        } else if (entry.note) {
          // Already active, but this entry has a note - close the old interval
          // and start a new one (no visual gap, end ms = next start ms)
          series[stateName].push({
            start: activeIntervals[stateName].start,
            end: currentTime,
            note: activeIntervals[stateName].note,
            time: activeIntervals[stateName].time,
          });
          activeIntervals[stateName] = {
            start: currentTime,
            note: entry.note,
            time: entry.time,
          };
        }
        // If already active with no new note, continue tracking
      } else {
        // State is not active
        if (activeIntervals[stateName]) {
          // Was active, now inactive - close the interval
          series[stateName].push({
            start: activeIntervals[stateName].start,
            end: currentTime,
            note: activeIntervals[stateName].note,
            time: activeIntervals[stateName].time,
          });
          delete activeIntervals[stateName];
        }
        // If wasn't active, stay inactive
      }
    }
  }

  // Close any intervals that are still active at the end
  for (const stateName of SERIES_ORDER) {
    if (activeIntervals[stateName]) {
      series[stateName].push({
        start: activeIntervals[stateName].start,
        end: endTime,
        note: activeIntervals[stateName].note,
        time: activeIntervals[stateName].time,
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
 * @returns {string[]} Array of active state names
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
