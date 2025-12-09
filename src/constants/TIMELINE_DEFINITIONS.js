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
  // Default height for timeline chart
  DEFAULT_HEIGHT: 110,

  // Label and axis spacing
  PLOT_LABEL_HEIGHT: 20,
  DIST_BELOW_X_AXIS: 10,
  DIST_FROM_X_AXIS: 85,

  // Text styling
  LABEL_TEXT_SIZE: 16,

  // Moon rendering
  MOON_RADIUS: 6,
  X_OFFSET: 4,
};

/**
 * Chart margin configuration
 */
export const TIMELINE_MARGINS = {
  top: 0, // Will be overridden if moon illumination is shown
  right: 30,
  left: 30,
  bottom: 0,
};

/**
 * Color constants for timeline elements
 */
export const TIMELINE_COLORS = {
  // Grid and reference lines
  GRID_LINE: "white",
  GRID_OPACITY: 0.1,
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
  MOON_SYMBOL_DARK: "#27272a",
  MOON_LABEL: "white",

  // Selection
  SELECTION_STROKE: "hotPink",
  SELECTION_FILL_OPACITY: 0.2,
  DEFAULT_SELECTION_FILL: "pink",
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
 * Y-axis domain configuration
 */
export const TIMELINE_Y_DOMAIN = {
  SINGLE_SERIES_PADDING: 0.5,
  MULTI_SERIES_MIN: 0,
  MULTI_SERIES_MIN_MAX: 10,
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
