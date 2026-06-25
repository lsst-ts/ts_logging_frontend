/**
 * Timeline Chart Constants and Definitions
 *
 * This file contains all constant values used in timeline chart rendering,
 * including dimensions, colors, and styling configurations.
 */

/**
 * Chart dimension constants
 */
export const TIMELINE_DIMENSIONS = {
  // Height per data series row, plus base added on top (breathing room, margins)
  SERIES_ROW_HEIGHT: 20,
  BASE_HEIGHT: 80, // +10 to compensate for increased bottom margin

  // Label and axis spacing
  PLOT_LABEL_HEIGHT: 20,
  DIST_BELOW_X_AXIS: 26, // +10 vs old value to keep date labels at same screen position after bottom margin increase
  DIST_FROM_X_AXIS: 85,

  // Text styling
  LABEL_TEXT_SIZE: 16,

  // Moon rendering
  MOON_RADIUS: 6,
  X_OFFSET: 6,

  // Hourly x-axis tick marks
  HOURLY_TICK_LENGTH: 8,
  HOURLY_TICK_LABEL_FONT_SIZE: 12,
};

/**
 * Chart margin configuration
 */
export const TIMELINE_MARGINS = {
  top: 20, // Space for labels (moon illumination, twilight) at top of chart
  right: 30,
  left: 30,
  bottom: 40, // Space for hourly tick labels + date labels
};

/**
 * Color constants for timeline elements
 */
export const TIMELINE_COLORS = {
  // Grid and reference lines
  GRID_LINE: "white",
  GRID_OPACITY: 0.1,
  HOUR_LABEL: "rgba(255, 255, 255, 0.4)",
  DAYOBS_BORDER: "grey",
  DAYOBS_LABEL: "grey",

  // Single series styling
  SINGLE_SERIES_LINE: "white",
  SINGLE_SERIES_STROKE_WIDTH: 1.5,

  // Multiple series styling
  MULTI_SERIES_LINE: "#606060",
  MULTI_SERIES_STROKE_WIDTH: 1,

  // Twilight
  TWILIGHT_LINE: "#0ea5e9",
  TWILIGHT_STROKE_WIDTH: 3,
  TWILIGHT_LABEL: "white",

  // Moon
  MOON_AREA_FILL: "#EAB308",
  MOON_AREA_OPACITY: 0.2,
  MOON_SYMBOL_LIGHT: "white",
  MOON_SYMBOL_DARK: "black",
  MOON_LABEL: "white",

  // Selection
  SELECTION_STROKE: "hotPink",
  DEFAULT_SELECTION_FILL: "rgba(136, 136, 136, 0.2)",
};

/**
 * Text styling constants
 */
export const TIMELINE_TEXT_STYLES = {
  LABEL_FONT_SIZE: 16,
  LABEL_FONT_WEIGHT: 100,
  LABEL_LETTER_SPACING: 0.5,
  AXIS_FONT_SIZE: "20",
};

/**
 * Opacity values for active/inactive states
 */
export const TIMELINE_OPACITY = {
  ACTIVE: 1,
  INACTIVE: 0.1,
};

/**
 * Interval configuration
 */
export const TIMELINE_INTERVALS = {
  HOURLY_TICK_INTERVAL: 1, // hours
};

/**
 * Timeline marker (data point) configuration
 */
export const TIMELINE_MARKER = {
  DEFAULT_HEIGHT: 16,
  DEFAULT_WIDTH: 1,
  DEFAULT_OPACITY: 1,
  DEFAULT_COLOR: "#3CAE3F",
};
