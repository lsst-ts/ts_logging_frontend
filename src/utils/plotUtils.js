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

/**
 * Converts Y-axis selection fractions to auto-domain fractions for zoom state.
 * Takes fractions from a drag selection (relative to current visible Y domain)
 * and converts them to fractions relative to the auto (full) Y domain.
 *
 * @param {number} startFractionY - Start fraction [0,1] of current Y domain
 * @param {number} endFractionY - End fraction [0,1] of current Y domain
 * @param {[number, number]} currentYDomain - Current visible Y domain [min, max]
 * @param {[number, number]} autoYDomain - Auto (full) Y domain [min, max]
 * @param {number} [minSelectionFraction=0.01] - Minimum selection size (1% of auto range)
 * @returns {{minFraction: number, maxFraction: number}} Auto-domain fractions
 */
export function calculateYZoomFractionsFromSelection(
  startFractionY,
  endFractionY,
  currentYDomain,
  autoYDomain,
  minSelectionFraction = 0.01,
) {
  // Map fractions to data Y values (using current domain)
  const [currentMin, currentMax] = currentYDomain;
  const currentRange = currentMax - currentMin;
  const startY = currentMin + startFractionY * currentRange;
  const endY = currentMin + endFractionY * currentRange;

  // Map data Y values to fractions of auto domain
  const [autoMin, autoMax] = autoYDomain;
  const autoRange = autoMax - autoMin;
  const yMin = Math.min(startY, endY);
  const yMax = Math.max(startY, endY);
  let minFraction = (yMin - autoMin) / autoRange;
  let maxFraction = (yMax - autoMin) / autoRange;

  // Ensure minimum selection size
  if (maxFraction - minFraction < minSelectionFraction) {
    const center = (minFraction + maxFraction) / 2;
    minFraction = center - minSelectionFraction / 2;
    maxFraction = center + minSelectionFraction / 2;
  }

  // Clamp to valid range [0, 1]
  return {
    minFraction: Math.max(0, minFraction),
    maxFraction: Math.min(1, maxFraction),
  };
}

/**
 * Calculates zoom-out Y-axis fractions where the current view fits inside the selection.
 * Inverts the zoom behavior - a small selection causes a large zoom out.
 *
 * @param {number} startFractionY - Start fraction [0,1] of current Y domain
 * @param {number} endFractionY - End fraction [0,1] of current Y domain
 * @param {[number, number]} currentYDomain - Current visible Y domain [min, max]
 * @param {[number, number]} autoYDomain - Auto (full) Y domain [min, max]
 * @returns {{minFraction: number, maxFraction: number}} Auto-domain fractions, capped at [0,1]
 */
export function calculateYZoomOutFromSelection(
  startFractionY,
  endFractionY,
  currentYDomain,
  autoYDomain,
) {
  // Map selection fractions to data Y values (using current domain)
  const [currentMin, currentMax] = currentYDomain;
  const currentRange = currentMax - currentMin;
  const selectionMin =
    currentMin + Math.min(startFractionY, endFractionY) * currentRange;
  const selectionMax =
    currentMin + Math.max(startFractionY, endFractionY) * currentRange;
  const selectionRange = selectionMax - selectionMin;
  const selectionCenter = (selectionMin + selectionMax) / 2;

  // Calculate zoom-out factor: how much wider should the view be?
  // If selection is 25% of current view, new view should be 4x wider
  const zoomOutFactor = currentRange / selectionRange;
  const newRange = currentRange * zoomOutFactor;

  // Calculate new domain centered on selection
  let newMin = selectionCenter - newRange / 2;
  let newMax = selectionCenter + newRange / 2;

  // Map new domain to fractions of auto domain
  const [autoMin, autoMax] = autoYDomain;
  const autoRange = autoMax - autoMin;
  let minFraction = (newMin - autoMin) / autoRange;
  let maxFraction = (newMax - autoMin) / autoRange;

  // Clamp to valid range [0, 1] (don't zoom out beyond default)
  return {
    minFraction: Math.max(0, minFraction),
    maxFraction: Math.min(1, maxFraction),
  };
}

/**
 * Calculates zoom-out X-axis (time) domain where the current view fits inside the selection.
 * Inverts the zoom behavior - a small selection causes a large zoom out.
 *
 * @param {number} startFractionX - Start fraction [0,1] of current X domain
 * @param {number} endFractionX - End fraction [0,1] of current X domain
 * @param {[number, number]} currentDomain - Current visible domain [min, max] in milliseconds
 * @param {[string, string]} fullTimeRange - Full time range [start, end] as DateTime strings
 * @returns {[number, number]} New domain [min, max] in milliseconds, capped at fullTimeRange
 */
export function calculateXZoomOutFromSelection(
  startFractionX,
  endFractionX,
  currentDomain,
  fullTimeRange,
) {
  const [currentMin, currentMax] = currentDomain;
  const currentRange = currentMax - currentMin;

  // Map selection fractions to milliseconds (using current domain)
  const selectionMin =
    currentMin + Math.min(startFractionX, endFractionX) * currentRange;
  const selectionMax =
    currentMin + Math.max(startFractionX, endFractionX) * currentRange;
  const selectionRange = selectionMax - selectionMin;
  const selectionCenter = (selectionMin + selectionMax) / 2;

  // Calculate zoom-out factor
  const zoomOutFactor = currentRange / selectionRange;
  const newRange = currentRange * zoomOutFactor;

  // Calculate new domain centered on selection
  let newMin = selectionCenter - newRange / 2;
  let newMax = selectionCenter + newRange / 2;

  // Convert fullTimeRange to milliseconds for clamping
  const fullMin = new Date(fullTimeRange[0]).getTime();
  const fullMax = new Date(fullTimeRange[1]).getTime();

  // Clamp to full time range (don't zoom out beyond default)
  newMin = Math.max(fullMin, newMin);
  newMax = Math.min(fullMax, newMax);

  // Round to integer milliseconds
  return [Math.round(newMin), Math.round(newMax)];
}
