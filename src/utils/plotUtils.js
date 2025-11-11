/**
 * Utility functions for timeseries plot data manipulation and formatting
 */

/**
 * Gets the plot area bounding box from a chart's SVG element
 * @param {SVGElement} svg - The SVG element containing the chart
 * @returns {DOMRect|null} The bounding box or null if not found
 */
export function getChartPlotBounds(svg) {
  if (!svg) return null;

  const clipPathRect = svg.querySelector("clipPath rect");
  if (!clipPathRect) return null;

  return clipPathRect.getBBox();
}

/**
 * Groups an array into an array of arrays based on a key property,
 * preserving insertion order using the provided Map.
 *
 * @param {Array} arr - Array of objects to group
 * @param {string} key - Property name to group by
 * @param {Map} map - Map with pre-initialized keys for grouping
 * @returns {Array<Array>} Array of grouped arrays
 */
export function groupBy(arr, key, map) {
  for (const obj of arr) {
    const prop = obj[key];
    if (!map.has(prop)) map.set(prop, []);
    map.get(prop).push(obj);
  }
  return [...map.values()];
}

/**
 * Dynamically calculate dot radius based on number of data points
 * for maximum visibility in plots.
 *
 * @param {number} n - Number of data points
 * @returns {number} Recommended dot radius in pixels
 */
export function scaleDotRadius(n) {
  if (n > 500) return 0.5;
  if (n > 200) return 0.75;
  if (n > 100) return 1;
  if (n > 50) return 2;
  if (n > 20) return 3;
  if (n > 10) return 4;
  return 5;
}

/**
 * Calculate appropriate number of decimal places for Y-axis ticks
 * based on the data range.
 *
 * @param {number} yRange - Range of Y values (max - min)
 * @returns {number} Number of decimal places to display
 */
export function calculateDecimalPlaces(yRange) {
  if (yRange > 5) return 0;
  if (yRange > 1.5) return 1;
  if (yRange > 0.02) return 2;
  if (yRange === 0) return 0;
  return 3;
}
