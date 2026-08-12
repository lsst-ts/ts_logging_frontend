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
 * Observatory state availability status
 * Indicates whether the observatory status data is fully available, partially
 * available, or not available at all over a requested dayobs range.
 */
export const OBSERVATORY_STATE_AVAILABILITY_STATUS = {
  FULL: "full",
  NONE: "none",
  PARTIAL: "partial",
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

  // Gap between the last state row and the Night Hours total row in the
  // label column, chosen to line the total up with the chart's date labels
  METRICS_TOTAL_ROW_GAP: 32,
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

/**
 * States with a meaningful hours metric.
 *
 * Metrics are requested night-only, so daytime is always zero and is left out
 * of the label column. The state keeps its chart row regardless.
 */
export const METRIC_STATES = SERIES_ORDER.filter(
  (stateName) => stateName !== "DAYTIME",
);

/**
 * Order of state plotting (last state plotted on top)
 */
export const STATUS_CUMULATIVE_SERIES_ORDER = [
  "UNKNOWN",
  "IDLE",
  "WEATHER",
  "DOWNTIME",
  "OPERATIONAL",
  "FAULT",
];

/**
 * z value of cumulative plot elements
 */
export const STATUS_CUMULATIVE_ELEMENTS_Z = {
  VERTICAL_LINES: 1,
  NIGHT_HOURS: 2,
  OPEN_DOME_LINE: 3,
  STATE_LINES: 4,
  X_AXIS_BREAKS: 5,
  GRID: 6,
  MARKERS: 7,
};

/**
 * Cumulative plot margin configuration
 */
export const STATUS_CUMULATIVE_MARGINS = {
  top: 20, // Space for twilight labels at top of chart
  right: 4,
  left: 20,
  bottom: 70, // Space for hourly tick labels + date labels
};

/**
 * Legend labels
 */
export const STATUS_CUMULATIVE_LEGEND_LABELS = {
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
export const STATUS_CUMULATIVE_AREA_OPACITY = {
  UNKNOWN: 0.5,
  DAYTIME: 0.4,
  OPERATIONAL: 0.4,
  FAULT: 0.4,
  WEATHER: 0.4,
  DOWNTIME: 0.4,
  IDLE: 0.5,
};

/**
 * Plot colours (not state-related)
 */
export const STATUS_CUMULATIVE_PLOT_COLOURS = {
  NAMES: "white",
  AXIS_LABEL: "#bbbbbb",
  AXIS_TICK: "#444444",
  BORDERS: "#444444",
  LEGEND_BACKGROUND: "#111111",
  HOUR_LINES: "#222222",
  BREAK_AREA_FILL: "#222222",
  STATUS_UPDATE_LINES: "white",
  MARKER_BORDER: "white",
  NIGHT_HOURS_LINE: "white",
  OPEN_DOME_LINE: "#CC79A7",
};

/**
 * Chart dimension constants
 */
export const STATUS_CUMULATIVE_DIMENSIONS = {
  TITLE_TOP: 0,
  GRID_BORDER_WIDTH: 2.5,

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

/**
 * Chart dimension constants that differ for fullscreen vs applet view
 */
export const STATUS_CUMULATIVE_VARIABLE_DIMENSIONS = {
  APPLET: {
    GRID_TOP: 40,
    X_AXIS_NAME_GAP: 22,
    X_AXIS_LABEL_MARGIN: 10,
  },
  FULL_SCREEN: {
    GRID_TOP: 50,
    X_AXIS_NAME_GAP: 26,
    X_AXIS_LABEL_MARGIN: 12,
  },
};

/**
 * Symbol marker sizes
 */
export const STATUS_CUMULATIVE_SYMBOL_SIZE = {
  APPLET: {
    WITH_NOTE: 12,
    WITHOUT_NOTE: 10,
  },
  FULL_SCREEN: {
    WITH_NOTE: 14,
    WITHOUT_NOTE: 12,
  },
};

/**
 * Font sizes for cumulative plot
 */
export const STATUS_CUMULATIVE_FONTS = {
  APPLET: {
    TITLE_FONT_SIZE: 16,
    LEGEND_FONT_SIZE: 10,
    X_AXIS_NAME_FONT_SIZE: 10,
    X_AXIS_LABEL_FONT_SIZE: 10,
    Y_AXIS_NAME_FONT_SIZE: 12,
    Y_AXIS_LABEL_FONT_SIZE: 10,
  },
  FULL_SCREEN: {
    TITLE_FONT_SIZE: 18,
    LEGEND_FONT_SIZE: 14,
    X_AXIS_NAME_FONT_SIZE: 16,
    X_AXIS_LABEL_FONT_SIZE: 14,
    Y_AXIS_NAME_FONT_SIZE: 16,
    Y_AXIS_LABEL_FONT_SIZE: 14,
  },
};
