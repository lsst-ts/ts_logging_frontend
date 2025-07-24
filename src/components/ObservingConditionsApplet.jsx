import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import DownloadIcon from "../assets/DownloadIcon.svg";
import InfoIcon from "../assets/InfoIcon.svg";
import { ChartContainer, ChartTooltip, ChartLegend } from "./ui/chart";
import {
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Scatter,
  Line,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ZAxis,
} from "recharts";
import { DateTime } from "luxon";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";

const XShape = (props) => {
  const { cx, cy, fill, payload } = props;
  const size = 1.5;
  if (cx < size || cy < size) return null;
  // {'u': '#3eb7ff', 'g': '#30c39f', 'r': '#ff7e00', 'i': '#2af5ff', 'z': '#a7f9c1', 'y': '#fdc900'}
  let color = fill;
  if (payload && payload.band) {
    if (payload.band === "u") color = "#3eb7ff";
    else if (payload.band === "g") color = "#30c39f";
    else if (payload.band === "r") color = "#ff7e00";
    else if (payload.band === "i") color = "#2af5ff";
    else if (payload.band === "z") color = "#a7f9c1";
    else if (payload.band === "y") color = "#fdc900";
    // Add more as needed
  }
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

// Custom triangle shape (pointing up)
const TriangleShape = (props) => {
  const { cx, cy, fill = "#2af5ff", r = 2 } = props;
  if (typeof cx !== "number" || typeof cy !== "number") return null;
  // const height = r * 2;
  // const width = r * 2;
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

// Custom triangle shape (pointing down)
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
  // Simple 5-pointed star
  const spikes = 5;
  const outerRadius = r;
  const innerRadius = r * 0.5;
  let rot = (Math.PI / 2) * 3;
  // let x = cx;
  // let y = cy;
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

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const uniqueData = new Map();
    payload.forEach((entry) => {
      if (entry.value !== null && entry.value !== undefined) {
        uniqueData.set(entry.dataKey, {
          name:
            entry.dataKey === "dimm_seeing" ? "Seeing" : "Zero Point Median",
          value:
            typeof entry.value === "number"
              ? entry.value.toFixed(2)
              : entry.value,
          color: entry.color,
        });
      }
    });
    return (
      <div className="bg-gray-800 border border-gray-600 text-white text-sm p-2 rounded shadow-lg">
        <p className="text-gray-300 mb-1">
          {new Date(label).toLocaleTimeString("en-AU", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
        {Array.from(uniqueData.values()).map((item, index) => (
          <p key={index} style={{ color: item.color }}>
            {item.name}: {item.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Custom legend component
const CustomLegend = () => {
  return (
    <div className="flex flex-col justify-center items-start flex-shrink-0 w-[140px] h-[280px] pl-2 bg-neutral-700 rounded-lg">
      <div className="p-3">
        <div className="flex items-center mb-3">
          <svg width="20" height="16" className="mr-2">
            <g>
              <line
                x1="2"
                y1="2"
                x2="10"
                y2="10"
                stroke="white"
                strokeWidth="1"
              />
              <line
                x1="2"
                y1="10"
                x2="10"
                y2="2"
                stroke="white"
                strokeWidth="1"
              />
            </g>
          </svg>
          <span className="text-xs text-white">Seeing</span>
        </div>
        <div className="flex items-center mb-3">
          <div className="w-4 h-2 bg-blue-500 rounded mr-2"></div>
          <span className="text-xs text-blue-300">Zero Point Line</span>
        </div>
        <div className="flex items-center">
          <svg width="16" height="16" className="mr-2">
            <circle cx="8" cy="8" r="3" fill="blue" />
          </svg>
          <span className="text-xs text-blue-300">Zero Point Points</span>
        </div>
      </div>
    </div>
  );
};

const renderCustomLegend = () => (
  <div className="flex flex-col gap-2 p-3 bg-black shadow-[4px_4px_4px_0px_#c27aff] border text-white text-xxs ml-10 shrink-0">
    <div className="flex items-center gap-2">
      <svg width="16" height="16" style={{ display: "inline" }}>
        <g>
          <XShape cx={8} cy={8} fill="#fff" />
        </g>
      </svg>
      <span>Seeing</span>
    </div>
    <div className="flex items-center gap-2">
      <svg width="16" height="16" style={{ display: "inline" }}>
        <g>
          <circle cx="8" cy="8" r="2" fill="#3eb7ff" />
        </g>
      </svg>
      <span>Zero Point (u)</span>
    </div>
    <div className="flex items-center gap-2">
      <svg width="16" height="16" style={{ display: "inline" }}>
        <g>
          <StarShape cx={8} cy={8} fill="#30c39f" r={2} />
        </g>
      </svg>
      <span>Zero Point (g)</span>
    </div>
    <div className="flex items-center gap-2">
      <svg width="16" height="16" style={{ display: "inline" }}>
        <g>
          <SquareShape cx={8} cy={8} fill="#ff7e00" r={2} />
        </g>
      </svg>
      <span>Zero Point (r)</span>
    </div>
    <div className="flex items-center gap-2">
      <svg width="16" height="16" style={{ display: "inline" }}>
        <g>
          <TriangleShape cx={8} cy={8} fill="#2af5ff" r={2} />
        </g>
      </svg>
      <span>Zero Point (i)</span>
    </div>
    <div className="flex items-center gap-2">
      <svg width="16" height="16" style={{ display: "inline" }}>
        <g>
          <FlippedTriangleShape cx={8} cy={8} fill="#2af5ff" r={2} />
        </g>
      </svg>
      <span>Zero Point (z)</span>
    </div>
    <div className="flex items-center gap-2">
      <svg width="16" height="16" style={{ display: "inline" }}>
        <g>
          <AsteriskShape cx={8} cy={8} fill="#fdc900" r={2} />
        </g>
      </svg>
      <span>Zero Point (y)</span>
    </div>
  </div>
);

function ObservingConditionsApplet({ exposuresLoading, exposureFields }) {
  const isMobile = useIsMobile();

  const chartData = exposureFields.map((entry) => {
    const obsStart = entry["obs_start"];
    let obs_start_dt = undefined;
    if (typeof obsStart === "string" && DateTime.fromISO(obsStart).isValid) {
      obs_start_dt = DateTime.fromISO(obsStart).toMillis();
    }
    return { ...entry, obs_start_dt };
  });

  const xVals = chartData
    .map((d) => d.obs_start_dt)
    .filter((v) => typeof v === "number" && !isNaN(v));
  //   const yVals = chartData
  //     .map((d) => d.dimm_seeing)
  //     .filter((v) => typeof v === "number" && !isNaN(v));
  const xMin = xVals.length ? Math.min(...xVals) : "auto";
  const xMax = xVals.length ? Math.max(...xVals) : "auto";
  //   const yMin = yVals.length ? Math.min(...yVals) : "auto";
  //   const yMax = yVals.length ? Math.max(...yVals) : "auto";
  // console.log("xMin:", xMin, "xMax:", xMax, "yMin:", yMin, "yMax:", yMax);
  // Generate evenly spaced ticks between xMin and xMax
  let xTicks = [];
  if (typeof xMin === "number" && typeof xMax === "number" && xMax > xMin) {
    const step = (xMax - xMin) / 9;
    for (let i = 0; i < 10; i++) {
      xTicks.push(Math.round(xMin + i * step));
    }
  }

  const chartConfig = {
    dimm_seeing: { label: "Seeing", color: "#ffffff" },
    zero_point_median: { label: "Zero Point Median", color: "#3b82f6" },
  };

  return (
    <Card className="border-none p-0 bg-stone-800 gap-2">
      <CardHeader className="grid-cols-3 bg-teal-900 p-4 rounded-sm align-center gap-0">
        <CardTitle className="text-white font-thin col-span-2">
          Observing Conditions
        </CardTitle>
        <div className="flex flex-row gap-2 justify-end">
          <Popover>
            <PopoverTrigger className="self-end min-w-4">
              <img src={DownloadIcon} />
            </PopoverTrigger>
            <PopoverContent className="bg-black text-white text-sm border-yellow-700">
              This is a placeholder for the download/export button.
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger className="self-end min-w-4">
              <img src={InfoIcon} />
            </PopoverTrigger>
            <PopoverContent className="bg-black text-white text-sm border-yellow-700 w-[300px]">
              This applet displays a summary of the observing conditions.
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 bg-black p-4 text-neutral-200 rounded-sm border-2 border-teal-900 h-[320px] font-thin">
        {exposuresLoading ? (
          <div className="flex-grow">
            <Skeleton className="w-full h-full min-h-[180px] bg-stone-900" />
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row items-stretch w-full h-full gap-2 overflow-hidden">
            <div className="flex-grow min-w-0 h-full">
              <ChartContainer config={chartConfig} className="w-full h-full">
                {/* <ResponsiveContainer width="100%" height="100%"> */}
                <ComposedChart margin={{ left: 20, right: 10, top: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#555" />
                  <XAxis
                    data={chartData}
                    dataKey="obs_start_dt"
                    type="number"
                    domain={["auto", "auto"]}
                    scale="time"
                    ticks={xTicks}
                    tickFormatter={(tick) =>
                      new Date(tick).toLocaleTimeString("en-AU", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    }
                    tick={{ fill: "white" }}
                    label={{
                      value: "Time (UTC)",
                      position: "bottom",
                      fill: "white",
                      dy: 25,
                    }}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fill: "white" }}
                    domain={["auto", "auto"]}
                    tickFormatter={(tick) => Number(tick).toFixed(2)}
                    label={{
                      value: "Seeing",
                      angle: -90,
                      position: "insideLeft",
                      fill: "white",
                      dx: -10,
                    }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fill: "white" }}
                    domain={["auto", "auto"]}
                    label={{
                      value: "Zero Points",
                      angle: 90,
                      position: "insideRight",
                      dx: 10,
                      fill: "white",
                    }}
                  />
                  {/* <ZAxis dataKey="zero_point_median" range={[20, 20]} /> */}
                  <ReferenceLine
                    x={xMin + 2000000}
                    stroke="#3eb7ff"
                    label="twilight"
                    yAxisId="left"
                    strokeDasharray="5 5"
                  />
                  <ReferenceLine
                    x={xMax - 2000000}
                    stroke="#3eb7ff"
                    label="twilight"
                    yAxisId="left"
                    strokeDasharray="5 5"
                  />

                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ strokeDasharray: "3 3", stroke: "#ffffff" }}
                  />
                  <Line
                    name="zero_point_median_u"
                    yAxisId="right"
                    type="monotone"
                    dataKey="zero_point_median"
                    dot={{ r: 1, fill: "#3eb7ff", stroke: "#3eb7ff" }}
                    data={chartData.map((d) => {
                      if (d.band !== "u") {
                        return { ...d, zero_point_median: null };
                      }
                      return d;
                    })}
                    isAnimationActive={false}
                  />
                  <Line
                    name="zero_point_median_g"
                    yAxisId="right"
                    type="monotone"
                    dataKey="zero_point_median"
                    stroke="#30c39f"
                    dot={(props) => {
                      const { key, ...rest } = props;
                      return (
                        <StarShape key={key} {...rest} fill="#30c39f" r={2} />
                      );
                    }}
                    data={chartData.map((d) => {
                      if (d.band !== "g") {
                        return { ...d, zero_point_median: null };
                      }
                      return d;
                    })}
                    isAnimationActive={false}
                  />
                  <Line
                    name="zero_point_median_r"
                    yAxisId="right"
                    type="monotone"
                    dataKey="zero_point_median"
                    stroke="#ff7e00"
                    dot={(props) => {
                      const { key, ...rest } = props;
                      return (
                        <SquareShape key={key} {...rest} fill="#ff7e00" r={2} />
                      );
                    }}
                    data={chartData.map((d) => {
                      if (d.band !== "r") {
                        return { ...d, zero_point_median: null };
                      }
                      return d;
                    })}
                    isAnimationActive={false}
                  />
                  {/* <Scatter
                      name="zero_point_median_r"
                      yAxisId="right"
                      type="monotone"
                      dataKey="zero_point_median"
                      stroke="#ff7e00"
                      fill="#ff7e00"
                      connectNulls="false"
                      shape={<SquareShape />}
                      // chartData={chartData}
                      // line
                      data={chartData.filter(d => d.band === 'y')}
                      isAnimationActive={false}
                    /> */}

                  <Line
                    name="zero_point_median_i"
                    yAxisId="right"
                    type="monotone"
                    dataKey="zero_point_median"
                    stroke="#2af5ff"
                    dot={(props) => {
                      const { key, ...rest } = props;
                      return (
                        <TriangleShape
                          key={key}
                          {...rest}
                          fill="#2af5ff"
                          r={2}
                        />
                      );
                    }}
                    data={chartData.map((d) => {
                      if (d.band !== "i") {
                        return { ...d, zero_point_median: null };
                      }
                      return d;
                    })}
                    isAnimationActive={false}
                  />
                  <Line
                    name="zero_point_median_z"
                    yAxisId="right"
                    type="monotone"
                    dataKey="zero_point_median"
                    stroke="#a7f9c1"
                    dot={(props) => {
                      const { key, ...rest } = props;
                      return (
                        <FlippedTriangleShape
                          key={key}
                          {...rest}
                          fill="#a7f9c1"
                          r={2}
                        />
                      );
                    }}
                    data={chartData.map((d) => {
                      if (d.band !== "z") {
                        return { ...d, zero_point_median: null };
                      }
                      return d;
                    })}
                    isAnimationActive={false}
                  />
                  <Line
                    name="zero_point_median_y"
                    yAxisId="right"
                    type="monotone"
                    dataKey="zero_point_median"
                    stroke="#fdc900"
                    dot={(props) => {
                      const { key, ...rest } = props;
                      return (
                        <AsteriskShape
                          key={key}
                          {...rest}
                          fill="#fdc900"
                          r={2}
                        />
                      );
                    }}
                    data={chartData.map((d) => {
                      if (d.band !== "y") {
                        return { ...d, zero_point_median: null };
                      }
                      return d;
                    })}
                    isAnimationActive={false}
                  />
                  <Scatter
                    name="dimm_seeing"
                    dataKey="dimm_seeing"
                    fill="white"
                    shape={(props) => <XShape {...props} />}
                    yAxisId="left"
                    data={chartData}
                  />
                  <ChartLegend
                    layout={isMobile ? "horizontal" : "vertical"}
                    verticalAlign={isMobile ? "bottom" : "middle"}
                    align={isMobile ? "center" : "right"}
                    content={renderCustomLegend}
                  />
                </ComposedChart>
                {/* </ResponsiveContainer> */}
              </ChartContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
// TODO: Use different(multi) series for each band
// Use multi series for multi nights
// TODO: check builtin shapes in recharts
// TODO: Try connect nulls
// TODO: try scatter with line rather than line with dots
// Update tooltips to show band and value
// update tooltip style
// Add twilight reference lines for multiple nights
// use segments to draw lines between points
{
  /* <Line
  dataKey="value"
  segments={[
    { type: 'line', points: [point1, point2] },
    { type: 'line', points: [point3, point4] },
  ]}
/> */
}
export default ObservingConditionsApplet;
