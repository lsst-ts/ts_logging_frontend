import { memo } from "react";

import { BAND_COLORS } from "@/components/PLOT_DEFINITIONS";

// no band
const NoBandCircleShape = memo((props) => {
  const {
    cx,
    cy,
    fill,
    r = 2,
    strokeOpacity = 1,
    fillOpacity = 1,
    ...shapeProps
  } = props;
  if (typeof cx !== "number" || typeof cy !== "number") return null;
  return (
    <circle
      {...shapeProps}
      cx={cx}
      cy={cy}
      r={r}
      fill={fill}
      stroke={fill}
      strokeOpacity={strokeOpacity}
      fillOpacity={fillOpacity}
    />
  );
});

// u band
const CircleShape = memo((props) => {
  const {
    cx,
    cy,
    fill = BAND_COLORS.u || "#4d4dff",
    r = 2,
    strokeOpacity = 1,
    fillOpacity = 1,
    ...shapeProps
  } = props;
  if (typeof cx !== "number" || typeof cy !== "number") return null;
  return (
    <circle
      {...shapeProps}
      cx={cx}
      cy={cy}
      r={r}
      fill={fill}
      strokeOpacity={strokeOpacity}
      fillOpacity={fillOpacity}
    />
  );
});

// Seeing
const XShape = memo((props) => {
  const {
    cx,
    cy,
    fill,
    strokeOpacity = 1,
    fillOpacity = 1,
    ...shapeProps
  } = props;
  const size = 1.5;
  if (cx < size || cy < size) return null;
  let color = fill;
  return (
    <g {...shapeProps}>
      <line
        x1={cx - size}
        y1={cy - size}
        x2={cx + size}
        y2={cy + size}
        stroke={color}
        strokeWidth={1}
        strokeOpacity={strokeOpacity}
        fillOpacity={fillOpacity}
      />
      <line
        x1={cx - size}
        y1={cy + size}
        x2={cx + size}
        y2={cy - size}
        stroke={color}
        strokeWidth={1}
        strokeOpacity={strokeOpacity}
        fillOpacity={fillOpacity}
      />
    </g>
  );
});

// g band
const TriangleShape = memo((props) => {
  const {
    cx,
    cy,
    fill = BAND_COLORS.g || "#30c39f",
    r = 2,
    strokeOpacity = 1,
    fillOpacity = 1,
    ...shapeProps
  } = props;
  if (typeof cx !== "number" || typeof cy !== "number") return null;
  return (
    <polygon
      {...shapeProps}
      points={`
        ${cx},${cy - r}
        ${cx - r},${cy + r}
        ${cx + r},${cy + r}
      `}
      fill={fill}
      stroke={fill}
      strokeWidth={0.8}
      strokeOpacity={strokeOpacity}
      fillOpacity={fillOpacity}
    />
  );
});

// r band
const FlippedTriangleShape = memo((props) => {
  const {
    cx,
    cy,
    fill = BAND_COLORS.r || "#ff7e00",
    r = 2,
    strokeOpacity = 1,
    fillOpacity = 1,
    ...shapeProps
  } = props;
  if (typeof cx !== "number" || typeof cy !== "number") return null;
  return (
    <polygon
      {...shapeProps}
      points={`
        ${cx},${cy + r}
        ${cx - r},${cy - r}
        ${cx + r},${cy - r}
      `}
      fill={fill}
      stroke={fill}
      strokeWidth={0.8}
      strokeOpacity={strokeOpacity}
      fillOpacity={fillOpacity}
    />
  );
});

// y band
const AsteriskShape = memo((props) => {
  const {
    cx,
    cy,
    fill = BAND_COLORS.y || "#fdc900",
    r = 4,
    strokeOpacity = 1,
    fillOpacity = 1,
    ...shapeProps
  } = props;
  if (typeof cx !== "number" || typeof cy !== "number") return null;
  const lines = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    const x1 = cx + Math.cos(angle) * (r * 0.5);
    const y1 = cy + Math.sin(angle) * (r * 0.5);
    const x2 = cx + Math.cos(angle) * r;
    const y2 = cy + Math.sin(angle) * r;
    lines.push(
      <line
        key={i}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={fill}
        strokeWidth={1.2}
        strokeLinecap="round"
        strokeOpacity={strokeOpacity}
        fillOpacity={fillOpacity}
      />,
    );
  }
  return <g {...shapeProps}>{lines}</g>;
});

// i band
const SquareShape = memo((props) => {
  const {
    cx,
    cy,
    fill = BAND_COLORS.i || "#2af5ff",
    r = 2,
    strokeOpacity = 1,
    fillOpacity = 1,
    ...shapeProps
  } = props;
  if (typeof cx !== "number" || typeof cy !== "number") return null;
  const size = r;
  return (
    <rect
      {...shapeProps}
      x={cx - size}
      y={cy - size}
      width={size * 2}
      height={size * 2}
      fill={fill}
      stroke={fill}
      strokeWidth={0.8}
      rx={0}
      strokeOpacity={strokeOpacity}
      fillOpacity={fillOpacity}
    />
  );
});

// z band
const StarShape = memo((props) => {
  const {
    cx,
    cy,
    fill = BAND_COLORS.z || "#a7f9c1",
    r = 4,
    strokeOpacity = 1,
    fillOpacity = 1,
    ...shapeProps
  } = props;
  if (typeof cx !== "number" || typeof cy !== "number") return null;
  const spikes = 5;
  const outerRadius = r;
  const innerRadius = r * 0.5;
  let rot = (Math.PI / 2) * 3;
  let step = Math.PI / spikes;
  let path = "";
  for (let i = 0; i < spikes; i++) {
    let x1 = cx + Math.cos(rot) * outerRadius;
    let y1 = cy + Math.sin(rot) * outerRadius;
    path += i === 0 ? `M${x1},${y1}` : `L${x1},${y1}`;
    rot += step;
    let x2 = cx + Math.cos(rot) * innerRadius;
    let y2 = cy + Math.sin(rot) * innerRadius;
    path += `L${x2},${y2}`;
    rot += step;
  }
  path += "Z";
  return (
    <path
      d={path}
      fill={fill}
      stroke={fill}
      strokeWidth={0.8}
      strokeOpacity={strokeOpacity}
      fillOpacity={fillOpacity}
      {...shapeProps}
    />
  );
});

// Band markers for the timeseries plots
const CustomisedDotWithShape = ({
  cx,
  cy,
  band,
  color,
  r = 2,
  graphID,
  obsID,
}) => {
  if (cx == null || cy == null) return null;

  const fill = BAND_COLORS[band] || color;

  // Choose shape based on band
  let ShapeComponent;
  switch (band) {
    case "u":
      ShapeComponent = CircleShape;
      break;
    case "g":
      ShapeComponent = TriangleShape;
      break;
    case "r":
      ShapeComponent = FlippedTriangleShape;
      break;
    case "i":
      ShapeComponent = SquareShape;
      break;
    case "z":
      ShapeComponent = StarShape;
      break;
    case "y":
      ShapeComponent = AsteriskShape;
      break;
    default:
      ShapeComponent = NoBandCircleShape;
  }

  return (
    <ShapeComponent
      cx={cx}
      cy={cy}
      r={r}
      fill={fill}
      style={{ pointerEvents: "all" }}
      // Include data-* attributes to allow this dot to be looked up for hover
      data-cx={cx}
      data-cy={cy}
      data-graphid={graphID}
      data-obsid={obsID}
    />
  );
};

// Band marker for the Observing Conditions Applet
const ObservingConditionsAppletDot = ({
  cx,
  cy,
  band,
  color,
  r = 2,
  opacity = 1,
}) => {
  if (cx == null || cy == null) return null;

  const fill = BAND_COLORS[band] || color;

  // Choose shape based on band
  let ShapeComponent;
  switch (band) {
    case "u":
      ShapeComponent = CircleShape;
      break;
    case "g":
      ShapeComponent = TriangleShape;
      break;
    case "r":
      ShapeComponent = FlippedTriangleShape;
      break;
    case "i":
      ShapeComponent = SquareShape;
      break;
    case "z":
      ShapeComponent = StarShape;
      break;
    case "y":
      ShapeComponent = AsteriskShape;
      break;
    default:
      // Default to the seeing dot
      ShapeComponent = XShape;
  }

  return (
    <ShapeComponent
      strokeOpacity={opacity}
      fillOpacity={opacity}
      cx={cx}
      cy={cy}
      r={r}
      fill={fill}
      style={{ pointerEvents: "all" }}
    />
  );
};

export {
  CircleShape,
  XShape,
  TriangleShape,
  FlippedTriangleShape,
  AsteriskShape,
  SquareShape,
  StarShape,
  CustomisedDotWithShape,
  ObservingConditionsAppletDot,
};
