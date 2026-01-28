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

  // Firefox doesn't return the bbox correctly for svg elements which
  // don't have a fill, so we have to extract the values directly rather
  // than just using clipPathRect.getBBox()
  // This works so long as recharts keeps the clipPath rect in sync
  // with the size of the graph, which it appears to do
  return {
    x: clipPathRect.getAttribute("x"),
    y: clipPathRect.getAttribute("y"),
    width: clipPathRect.getAttribute("width"),
    height: clipPathRect.getAttribute("height"),
  };
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
 * Generic zoom calculation function that handles both zoom-in and zoom-out operations.
 *
 * @param {[number, number]} selection - [start, end] as fractions [0,1] of the current domain
 * @param {"in" | "out"} direction - Zoom direction: "in" to zoom into selection, "out" to zoom out from selection
 * @param {[number, number]} currentDomain - Current visible domain [min, max]
 * @param {[number, number]} maxDomain - Maximum domain at minimum zoom [min, max]
 * @returns {[number, number]} New domain [min, max], clamped to maxDomain
 */
export function calculateZoom(selection, direction, currentDomain, maxDomain) {
  const [startFraction, endFraction] = selection;
  const [currentMin, currentMax] = currentDomain;
  const [maxMin, maxMax] = maxDomain;

  const currentRange = currentMax - currentMin;
  const selectionMin =
    currentMin + Math.min(startFraction, endFraction) * currentRange;
  const selectionMax =
    currentMin + Math.max(startFraction, endFraction) * currentRange;

  if (direction === "in") {
    // Zoom in: selection becomes the new domain

    // Clamp to max domain bounds
    const newMin = Math.max(maxMin, selectionMin);
    const newMax = Math.min(maxMax, selectionMax);

    return [newMin, newMax];
  } else if (direction === "out") {
    // Zoom out: current view fits inside the selection (inverted behavior)
    const selectionRange = selectionMax - selectionMin;
    const selectionCenter = (selectionMin + selectionMax) / 2;

    // Calculate zoom-out factor: how much wider should the view be?
    // If selection is 25% of current view, new view should be 4x wider
    const zoomOutFactor = currentRange / selectionRange;
    const newRange = currentRange * zoomOutFactor;

    // Calculate new domain centered on selection
    let newMin = selectionCenter - newRange / 2;
    let newMax = selectionCenter + newRange / 2;

    // Clamp to max domain bounds (don't zoom out beyond default)
    newMin = Math.max(maxMin, newMin);
    newMax = Math.min(maxMax, newMax);

    return [newMin, newMax];
  }

  // Invalid direction, return current domain unchanged
  return [currentMin, currentMax];
}
