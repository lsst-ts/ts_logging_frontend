import { BAND_COLORS } from "../components/PLOT_DEFINITIONS";
import { CustomisedDotWithShape } from "../components/plotDotShapes";

// Generate
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
