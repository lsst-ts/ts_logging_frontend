const XShape = (props) => {
  const { cx, cy, fill } = props;
  const size = 1.5;
  if (cx < size || cy < size) return null;
  let color = fill;
  return (
    <g>
      <line
        x1={cx - size}
        y1={cy - size}
        x2={cx + size}
        y2={cy + size}
        stroke={color}
        strokeWidth={1}
      />
      <line
        x1={cx - size}
        y1={cy + size}
        x2={cx + size}
        y2={cy - size}
        stroke={color}
        strokeWidth={1}
      />
    </g>
  );
};

const TriangleShape = (props) => {
  const { cx, cy, fill = "#2af5ff", r = 2 } = props;
  if (typeof cx !== "number" || typeof cy !== "number") return null;
  return (
    <polygon
      points={`
        ${cx},${cy - r}
        ${cx - r},${cy + r}
        ${cx + r},${cy + r}
      `}
      fill={fill}
      stroke={fill}
      strokeWidth={0.8}
    />
  );
};

const FlippedTriangleShape = (props) => {
  const { cx, cy, fill = "#a7f9c1", r = 2 } = props;
  if (typeof cx !== "number" || typeof cy !== "number") return null;
  return (
    <polygon
      points={`
        ${cx},${cy + r}
        ${cx - r},${cy - r}
        ${cx + r},${cy - r}
      `}
      fill={fill}
      stroke={fill}
      strokeWidth={0.8}
    />
  );
};

const AsteriskShape = (props) => {
  const { cx, cy, fill = "#fdc900", r = 4 } = props;
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
      />,
    );
  }
  return <g>{lines}</g>;
};

const SquareShape = (props) => {
  const { cx, cy, fill = "#ff7e00", r = 2 } = props;
  if (typeof cx !== "number" || typeof cy !== "number") return null;
  const size = r;
  return (
    <rect
      x={cx - size}
      y={cy - size}
      width={size * 2}
      height={size * 2}
      fill={fill}
      stroke={fill}
      strokeWidth={0.8}
      rx={0}
    />
  );
};

const StarShape = (props) => {
  const { cx, cy, fill = "#30c39f", r = 4 } = props;
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
  return <path d={path} fill={fill} stroke={fill} strokeWidth={0.8} />;
};

export {
  XShape,
  TriangleShape,
  FlippedTriangleShape,
  AsteriskShape,
  SquareShape,
  StarShape,
};
