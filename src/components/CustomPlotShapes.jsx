// Constants for squiggle shapes used in timeseries plots
export const SQUIGGLE_SEGMENTS = 10;
export const SQUIGGLE_AMPLITUDE = 2;
export const SQUIGGLE_STROKE_COLOR = "#666666";
export const SQUIGGLE_STROKE_WIDTH = 2;
export const SQUIGGLE_STROKE_LINECAP = "round";
export const SQUIGGLE_STROKE_LINEJOIN = "round";

/**
 * Custom label component for day_obs break lines in timeseries plots.
 * Renders a vertical squiggle line to visually separate different day observations.
 */
export function DayObsBreakLine({ viewBox }) {
  // `viewBox` gives us the x/y position of the reference line
  const { x, y, height } = viewBox;

  // Build a zig-zag path down the axis
  const step = height / SQUIGGLE_SEGMENTS;
  let d = `M ${x} ${y}`;
  for (let i = 1; i <= SQUIGGLE_SEGMENTS; i++) {
    const yy = y + i * step;
    const offset = i % 2 === 0 ? SQUIGGLE_AMPLITUDE : -SQUIGGLE_AMPLITUDE;
    d += ` L ${x + offset} ${yy}`;
  }

  return (
    <g>
      <path
        d={d}
        stroke={SQUIGGLE_STROKE_COLOR}
        strokeWidth={SQUIGGLE_STROKE_WIDTH}
        fill="none"
        strokeLinecap={SQUIGGLE_STROKE_LINECAP}
        strokeLinejoin={SQUIGGLE_STROKE_LINEJOIN}
      />
    </g>
  );
}

/**
 * Custom shape component for no-data reference areas in timeseries plots.
 * Renders a filled area with squiggly left and right edges that match the
 * day_obs break squiggle lines for visual consistency.
 */
export function NoDataReferenceArea({
  x,
  y,
  width,
  height,
  fill,
  fillOpacity,
}) {
  // Build squiggle paths for left and right edges
  const step = height / SQUIGGLE_SEGMENTS;

  const x1 = x;
  const x2 = x + width;
  const yMin = y;
  const yMax = y + height;

  // Create closed path for filled area
  let areaPath = `M ${x1} ${yMin}`;
  for (let i = 1; i <= SQUIGGLE_SEGMENTS; i++) {
    const yy = yMin + i * step;
    const offset = i % 2 === 0 ? SQUIGGLE_AMPLITUDE : -SQUIGGLE_AMPLITUDE;
    areaPath += ` L ${x1 + offset} ${yy}`;
  }
  // Top edge
  areaPath += ` L ${x2} ${yMax}`;
  // Right edge (back down)
  for (let i = SQUIGGLE_SEGMENTS; i >= 0; i--) {
    const yy = yMin + i * step;
    const offset = i % 2 === 0 ? SQUIGGLE_AMPLITUDE : -SQUIGGLE_AMPLITUDE;
    areaPath += ` L ${x2 + offset} ${yy}`;
  }
  // Bottom edge
  areaPath += ` L ${x1} ${yMin}`;

  return (
    <g>
      <path d={areaPath} fill={fill} fillOpacity={fillOpacity} />
    </g>
  );
}

/**
 * Custom shape component for moon reference areas in timeseries plots.
 * Renders a filled area with conditional squiggly edges based on whether
 * the moon event occurs at a dayobs boundary.
 */
export function MoonReferenceArea({
  x,
  y,
  width,
  height,
  fill,
  fillOpacity,
  startIsZigzag,
  endIsZigzag,
}) {
  const step = height / SQUIGGLE_SEGMENTS;

  const x1 = x;
  const x2 = x + width;
  const yMin = y;
  const yMax = y + height;

  // Create closed path for filled area
  let areaPath = `M ${x1} ${yMin}`;

  // Left edge (going up)
  if (startIsZigzag) {
    for (let i = 1; i <= SQUIGGLE_SEGMENTS; i++) {
      const yy = yMin + i * step;
      const offset = i % 2 === 0 ? SQUIGGLE_AMPLITUDE : -SQUIGGLE_AMPLITUDE;
      areaPath += ` L ${x1 + offset} ${yy}`;
    }
  } else {
    areaPath += ` L ${x1} ${yMax}`;
  }

  // Top edge
  areaPath += ` L ${x2} ${yMax}`;

  // Right edge (going down)
  if (endIsZigzag) {
    for (let i = SQUIGGLE_SEGMENTS; i >= 0; i--) {
      const yy = yMin + i * step;
      const offset = i % 2 === 0 ? SQUIGGLE_AMPLITUDE : -SQUIGGLE_AMPLITUDE;
      areaPath += ` L ${x2 + offset} ${yy}`;
    }
  } else {
    areaPath += ` L ${x2} ${yMin}`;
  }

  // Bottom edge
  areaPath += ` L ${x1} ${yMin}`;

  return (
    <g>
      <path d={areaPath} fill={fill} fillOpacity={fillOpacity} />
    </g>
  );
}
