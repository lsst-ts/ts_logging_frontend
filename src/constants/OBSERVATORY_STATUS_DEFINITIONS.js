/**
 * Observatory Status Timeline Constants and Definitions
 *
 * This file contains bitmask definitions, colors, and styling configurations
 * for the observatory status timeline component.
 */

/**
 * Observatory state bitmask values
 * Each state corresponds to a bit position in the status field
 */
export const OBSERVATORY_STATES = {
  UNKNOWN: 0, // 0 - No state information
  DAYTIME: 1 << 0, // 1 - Sun is up
  OPERATIONAL: 1 << 1, // 2 - Observatory is operational
  FAULT: 1 << 2, // 4 - A fault condition exists
  WEATHER: 1 << 3, // 8 - Weather-related status
  DOWNTIME: 1 << 4, // 16 - Scheduled or unscheduled downtime
  IDLE: 1 << 5, // 32 - Observatory is idle
};

/**
 * Human-readable labels for each state
 */
export const STATUS_LABELS = {
  UNKNOWN: "Unknown",
  DAYTIME: "Daytime",
  OPERATIONAL: "Operational",
  FAULT: "Fault",
  WEATHER: "Weather",
  DOWNTIME: "Downtime",
  IDLE: "Idle",
};

/**
 * Color scheme for each observatory state
 * Colors chosen for visual distinction and semantic meaning
 */
export const STATUS_COLORS = {
  UNKNOWN: "#0C4A47",
  DAYTIME: "#00A370",
  OPERATIONAL: "#00A370",
  FAULT: "#DF5601",
  WEATHER: "#49CFE5",
  DOWNTIME: "#F0E400",
  IDLE: "#788F9B",
};

/**
 * Bar colors at 40% intensity (blended with black background)
 * These are solid colors that appear as if the STATUS_COLORS are at 40% opacity
 */
export const STATUS_BAR_COLORS = {
  UNKNOWN: "#051E1C",
  DAYTIME: "#00412D",
  OPERATIONAL: "#00412D",
  FAULT: "#592200",
  WEATHER: "#1D535C",
  DOWNTIME: "#605B00",
  IDLE: "#30393E",
};

/**
 * Chart dimension constants
 */
export const STATUS_TIMELINE_DIMENSIONS = {
  // Height per data series row
  SERIES_ROW_HEIGHT: 20,

  // Bar/marker styling
  BAR_HEIGHT: 12,
  MARKER_SIZE: 14,
  MARKER_SIZE_WITH_NOTE: 16,
};

/**
 * Chart margin configuration
 */
export const STATUS_TIMELINE_MARGINS = {
  top: 20, // Space for twilight labels at top of chart
  right: 30,
  left: 30,
  bottom: 40, // Space for hourly tick labels + date labels
};

/**
 * Order of series from top to bottom in the chart
 */
export const SERIES_ORDER = [
  "DAYTIME",
  "OPERATIONAL",
  "FAULT",
  "WEATHER",
  "DOWNTIME",
  "IDLE",
  "UNKNOWN",
];
