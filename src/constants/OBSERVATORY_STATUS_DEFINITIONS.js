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
  UNKNOWN: "UNKNOWN",
  DAYTIME: "DAYTIME",
  OPERATIONAL: "OPERATIONAL",
  FAULT: "FAULT",
  WEATHER: "WEATHER",
  DOWNTIME: "DOWNTIME",
  IDLE: "IDLE",
};

/**
 * Color scheme for each observatory state
 * Colors chosen for visual distinction and semantic meaning
 */
export const STATUS_COLORS = {
  UNKNOWN: "#788F9B",
  DAYTIME: "#22C55E",
  OPERATIONAL: "#22C55E",
  FAULT: "#DF5601",
  WEATHER: "#49CFE5",
  DOWNTIME: "#F0E400",
  IDLE: "#788F9B",
};

/**
 * Chart dimension constants
 */
export const STATUS_TIMELINE_DIMENSIONS = {
  // Height per data series row
  SERIES_ROW_HEIGHT: 20,

  // Base height for labels and margins
  BASE_HEIGHT: 50,

  // Label and axis spacing
  PLOT_LABEL_HEIGHT: 20,
  DIST_BELOW_X_AXIS: 16,

  // Text styling
  LABEL_TEXT_SIZE: 14,
  AXIS_LABEL_TEXT_SIZE: 12,

  // Bar/marker styling
  BAR_HEIGHT: 12,
  MARKER_SIZE: 6,
  MARKER_SIZE_WITH_NOTE: 8,
};

/**
 * Chart margin configuration
 */
export const STATUS_TIMELINE_MARGINS = {
  top: 10,
  right: 30,
  left: 100, // Space for state labels on the left
  bottom: 40, // Space for dayobs labels and twilight labels
};

/**
 * Twilight line styling
 */
export const TWILIGHT_STYLES = {
  TWELVE_DEG: {
    color: "#0ea5e9", // Sky blue
    lineWidth: 2,
    lineType: "solid",
    label: "12°",
  },
  ZERO_DEG: {
    color: "#0ea5e9", // Same blue
    lineWidth: 2,
    lineType: "dashed",
    dashPattern: [5, 5], // 5px dash, 5px gap
    label: "0°",
  },
};

/**
 * Opacity values for active/inactive states
 */
export const STATUS_OPACITY = {
  ACTIVE: 1,
  INACTIVE: 0.3,
  HOVER: 0.8,
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
