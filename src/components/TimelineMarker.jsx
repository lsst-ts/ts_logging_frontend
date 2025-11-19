// Unified marker component for timeline charts
// Supports both vertical line and diamond shapes

const TimelineMarker = ({
  cx,
  cy,
  color,
  h = 16,
  w = 1,
  type = "line",
  opacity = 1,
}) => {
  if (cx == null || cy == null) return null;

  // Defaults
  const height = h || (type === "line" ? 20 : 16);
  const width = w || 1;
  const halfHeight = height / 2;
  const halfWidth = width / 2;
  const fill = color || "#3CAE3F";

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
