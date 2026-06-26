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

  // Base height for labels and margins
  BASE_HEIGHT: 60,

  // Label and axis spacing
  PLOT_LABEL_HEIGHT: 20,
  DIST_BELOW_X_AXIS: 16,

  // Text styling
  LABEL_TEXT_SIZE: 14,
  AXIS_LABEL_TEXT_SIZE: 12,

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

/**
 * z value of cumulative plot elements
 */
export const CUMULATIVE_ELEMENTS_Z = {
  verticalLines: 1,
  nightHours: 2,
  openDomeLine: 3,
  stateLines: 4,
  xAxisBreaks: 5,
  grid: 6,
  markers: 7,
};

/**
 * Cumulative plot margin configuration
 */
export const STATUS_CUMULATIVE_MARGINS = {
  top: 20, // Space for twilight labels at top of chart
  right: 4,
  left: 30,
  bottom: 70, // Space for hourly tick labels + date labels
};

/**
 * legend labels
 */
export const LEGEND_LABELS = {
  UNKNOWN: "unknown",
  DAYTIME: "daytime",
  OPERATIONAL: "operational",
  FAULT: "fault",
  WEATHER: "weather",
  DOWNTIME: "downtime",
  IDLE: "idle",
};

/**
 * Opacity mapping for states
 */
export const STATUS_AREA_OPACITY = {
  UNKNOWN: 0.5,
  DAYTIME: 0.4,
  OPERATIONAL: 0.4,
  FAULT: 0.4,
  WEATHER: 0.4,
  DOWNTIME: 0.4,
  IDLE: 0.5,
};

/**
 * Commonly used text colours
 */
export const CUMULATIVE_PLOT_COLOURS = {
  names: "white",
  axisLabel: "#bbbbbb",
  axisTick: "#444444",
  borders: "#444444",
  legendBackground: "#111111",
  hourLines: "#222222",
  breakAreaFill: "#222222",
  statusUpdateLines: "white",
  markerBorder: "white",
  nightHoursLine: "white",
  openDomeLine: "#CC79A7",
};

/**
 * Chart dimension constants
 */
export const STATUS_CUMULATIVE_DIMENSIONS = {
  TITLE_TOP: 0,
  GRID_BORDER_WIDTH: 2,

  // Legend
  LEGEND_BORDER_WIDTH: 2,
  LEGEND_BORDER_RADIUS: 2,
  LEGEND_BORDER_BOTTOM: 2,
  LEGEND_LINES_WIDTH: 5,
  LEGEND_INACTIVE_WIDTH: 1,

  // Axes
  BREAK_BORDER_WIDTH: 4,
  Y_AXIS_NAME_GAP: 24,
  Y_AXIS_LABEL_WIDTH: 8,
  AXIS_TICK_WIDTH: 2,

  // Data
  STATE_LINE_WIDTH: 2,
  OPEN_DOME_LINE_WIDTH: 2,
  NIGHT_HOURS_LINE_WIDTH: 2,
  VERTICAL_LINES_WIDTH: 0.5,
  VERTICAL_LINES_OPACITY: 0.3,
  MARKER_BORDER_WIDTH: 1,
};
