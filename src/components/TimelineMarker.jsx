import { TIMELINE_MARKER } from "@/constants/TIMELINE_DEFINITIONS";

// Unified marker component for timeline charts
const TimelineMarker = ({
  cx,
  cy,
  color,
  h = TIMELINE_MARKER.DEFAULT_HEIGHT,
  w = TIMELINE_MARKER.DEFAULT_WIDTH,
  opacity = TIMELINE_MARKER.DEFAULT_OPACITY,
}) => {
  if (cx == null || cy == null) return null;

  // Defaults
  const height = h || TIMELINE_MARKER.DEFAULT_HEIGHT;
  const width = w || TIMELINE_MARKER.DEFAULT_WIDTH;
  const halfHeight = height / 2;
  const halfWidth = width / 2;
  const fill = color || TIMELINE_MARKER.DEFAULT_COLOR;

  // Diamond shape (polygon)
  const points = `
      ${halfWidth},0
      ${width},${halfHeight}
      ${halfWidth},${height}
      0,${halfHeight}
    `;

  return (
    <svg
      x={cx - halfWidth}
      y={cy - halfHeight}
      width={width}
      height={height}
      style={{ opacity }}
    >
      <polygon points={points} fill={fill} />
    </svg>
  );
};

export default TimelineMarker;
