import { BAND_COLORS } from "../components/PLOT_DEFINITIONS";
import { CustomisedDotWithShape } from "../components/plotDotShapes";

/**
 * Creates a callback function for rendering data points on timeseries plots.
 *
 * This factory function returns a Recharts-compatible dot rendering callback that is used
 * by the Line component to customize how each data point is displayed on the chart.
 *
 * @param {string} graphID - Unique identifier for the graph, used for hover interactions
 * @param {number} r - Radius of the dot/shape to render
 * @param {Object} options - Configuration options for dot rendering
 * @param {boolean} options.band - If true, uses band-specific colors from payload.band
 * @param {string} options.color - Fallback color to use when band coloring is not enabled
 * @param {boolean} options.useShape - If true (and band is true), renders band-specific shapes
 *                                     (circles, triangles, squares, etc.). If false, renders
 *                                     colored circles only.
 *
 * @returns {Function} A callback function with signature ({ index, payload, cx, cy }) that
 *                     returns a React element to render for each data point
 *
 * @example
 * // For band plots with shapes (u=circle, g=triangle, r=inverted triangle, etc.)
 * lineProps.dot = createDotCallback(graphID, 2, { band: true, useShape: true });
 *
 * @example
 * // For band plots with colors only (all circles, different colors)
 * lineProps.dot = createDotCallback(graphID, 2, { band: true, useShape: false, color: selectedColor });
 *
 * @example
 * // For standard single-color dots
 * lineProps.dot = createDotCallback(graphID, 2, { color: selectedColor });
 */
export function createDotCallback(graphID, r, { band, color, useShape }) {
  // Band coloring and shape
  if (band && useShape) {
    return ({ index, payload, cx, cy }) => {
      return (
        <CustomisedDotWithShape
          cx={cx}
          cy={cy}
          r={r}
          key={`dot-${index}`}
          band={payload.band}
          obsID={payload["exposure id"]}
          graphID={graphID}
        />
      );
    };
  }
  // Band coloring but no shape
  if (band && !useShape) {
    return ({ index, payload, cx, cy }) => {
      // Will default to NoBandCircleShape
      return (
        <CustomisedDotWithShape
          cx={cx}
          cy={cy}
          r={r}
          key={`dot-${index}`}
          color={BAND_COLORS[payload.band] || color}
          obsID={payload["exposure id"]}
          graphID={graphID}
        />
      );
    };
  }
  // No band coloring
  return ({ index, payload, cx, cy }) => {
    return (
      <CustomisedDotWithShape
        cx={cx}
        cy={cy}
        r={r}
        key={`dot-${index}`}
        color={color}
        obsID={payload["exposure id"]}
        graphID={graphID}
      />
    );
  };
}
