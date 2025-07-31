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
  ReferenceArea,
} from "recharts";
import { DateTime } from "luxon";
import { Skeleton } from "@/components/ui/skeleton";
// import { useIsMobile } from "@/hooks/use-mobile";

const GAP_THRESHOLD = 5 * 60 * 1000;
const GAP_MAX_THRESHOLD = 60 * 60 * 1000;

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
  // console.log(
  //   "Tooltip triggered at:",
  //   DateTime.fromMillis(label).toFormat("yyyy-MM-dd HH:mm:ss"),
  //   payload,
  // );
  if (active && payload && payload.length) {
    // Filter out entries with null or undefined values
    // const filteredPayload = payload.filter(
    //   (entry) => entry.value !== null && entry.value !== undefined
    // );

    // if (filteredPayload.length === 0) return null;

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
    if (uniqueData.size === 0) return null;
    uniqueData.set("Band", {
      name: "Band",
      value: payload[0].payload.band || "N/A",
      color: "#ffffff",
    });
    return (
      <div className="bg-white text-black text-xs p-2 border border-white rounded text-black font-bold mb-1">
        <p>{DateTime.fromMillis(label).toFormat("yyyy-MM-dd HH:mm:ss")}</p>
        {Array.from(uniqueData.values()).map((item, index) => (
          <p key={index}>
            {item.name}: {item.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Custom legend component
// const CustomLegend = () => {
//   return (
//     <div className="flex flex-col justify-center items-start flex-shrink-0 w-[140px] h-[280px] pl-2 bg-neutral-700 rounded-lg">
//       <div className="p-3">
//         <div className="flex items-center mb-3">
//           <svg width="20" height="16" className="mr-2">
//             <g>
//               <line
//                 x1="2"
//                 y1="2"
//                 x2="10"
//                 y2="10"
//                 stroke="white"
//                 strokeWidth="1"
//               />
//               <line
//                 x1="2"
//                 y1="10"
//                 x2="10"
//                 y2="2"
//                 stroke="white"
//                 strokeWidth="1"
//               />
//             </g>
//           </svg>
//           <span className="text-xs text-white">Seeing</span>
//         </div>
//         <div className="flex items-center mb-3">
//           <div className="w-4 h-2 bg-blue-500 rounded mr-2"></div>
//           <span className="text-xs text-blue-300">Zero Point Line</span>
//         </div>
//         <div className="flex items-center">
//           <svg width="16" height="16" className="mr-2">
//             <circle cx="8" cy="8" r="3" fill="blue" />
//           </svg>
//           <span className="text-xs text-blue-300">Zero Point Points</span>
//         </div>
//       </div>
//     </div>
//   );
// };

// const renderCustomLegend = () => (
//   <div className="flex flex-col gap-2 p-3 bg-black shadow-[4px_4px_4px_0px_#c27aff] border text-white text-xxs ml-10 shrink-0">
//     <div className="grid lg:grid-cols-1 h-full md:shrink-1">
//       <div className="flex items-center gap-2">
//         <svg width="6" height="20" className="mr-2">
//           <line
//             x1="6"
//             y1="0"
//             x2="6"
//             y2="20"
//             stroke="#3eb7ff"
//             strokeWidth="2"
//             strokeDasharray="3 2"
//           />
//         </svg>
//         <span>Twilight</span>
//       </div>
//       <div className="flex items-center gap-2">
//         <span className="inline-block w-3 h-4 mr-2 bg-teal-800 bg-opacity-90 border border-teal-900" />
//         Shutter Closed
//       </div>
//       <div className="flex items-center gap-2">
//         <svg width="16" height="16" style={{ display: "inline" }}>
//           <g>
//             <XShape cx={8} cy={8} fill="#fff" />
//           </g>
//         </svg>
//         <span>Seeing</span>
//       </div>
//       <div className="flex items-center gap-2">
//         <svg width="16" height="16" style={{ display: "inline" }}>
//           <g>
//             <circle cx="8" cy="8" r="2" fill="#3eb7ff" />
//           </g>
//         </svg>
//         <span>Zero Point (u)</span>
//       </div>
//       <div className="flex items-center gap-2">
//         <svg width="16" height="16" style={{ display: "inline" }}>
//           <g>
//             <StarShape cx={8} cy={8} fill="#30c39f" r={2} />
//           </g>
//         </svg>
//         <span>Zero Point (g)</span>
//       </div>
//       <div className="flex items-center gap-2">
//         <svg width="16" height="16" style={{ display: "inline" }}>
//           <g>
//             <SquareShape cx={8} cy={8} fill="#ff7e00" r={2} />
//           </g>
//         </svg>
//         <span>Zero Point (r)</span>
//       </div>
//       <div className="flex items-center gap-2">
//         <svg width="16" height="16" style={{ display: "inline" }}>
//           <g>
//             <TriangleShape cx={8} cy={8} fill="#2af5ff" r={2} />
//           </g>
//         </svg>
//         <span>Zero Point (i)</span>
//       </div>
//       <div className="flex items-center gap-2">
//         <svg width="16" height="16" style={{ display: "inline" }}>
//           <g>
//             <FlippedTriangleShape cx={8} cy={8} fill="#2af5ff" r={2} />
//           </g>
//         </svg>
//         <span>Zero Point (z)</span>
//       </div>
//       <div className="flex items-center gap-2">
//         <svg width="16" height="16" style={{ display: "inline" }}>
//           <g>
//             <AsteriskShape cx={8} cy={8} fill="#fdc900" r={2} />
//           </g>
//         </svg>
//         <span>Zero Point (y)</span>
//       </div>
//     </div>
//   </div>
// );

const renderCustomLegend = () => (
  <div className="w-full lg:w-32 h-fit flex-shrink-0">
    <div className="flex flex-wrap gap-1 px-4 py-2 bg-black shadow-[4px_4px_4px_0px_#c27aff] border text-white text-xxs justify-start ">
      <div className="flex items-center gap-2">
        <svg width="6" height="20" className="mr-2">
          <line
            x1="6"
            y1="0"
            x2="6"
            y2="20"
            stroke="#3eb7ff"
            strokeWidth="2"
            strokeDasharray="3 2"
          />
        </svg>
        <span>twilight</span>
      </div>

      <div className="flex items-center gap-2">
        <span className="inline-block w-3 h-4 mr-2 bg-teal-800 bg-opacity-90 border border-teal-900" />
        shutter closed
      </div>

      <div className="flex items-center gap-2">
        <svg width="16" height="16">
          <g>
            <XShape cx={8} cy={8} fill="#fff" />
          </g>
        </svg>
        <span>seeing</span>
      </div>

      <div className="w-full text-white text-xxs">zero points</div>
      <div className="flex flex-wrap gap-2 p-2 border border-white grid grid-cols-2 gap-3">
        <div className="flex items-center gap-1">
          <svg width="16" height="16">
            <circle cx="8" cy="8" r="2" fill="#3eb7ff" />
          </svg>
          <span>u</span>
        </div>
        <div className="flex items-center gap-1">
          <svg width="16" height="16">
            <StarShape cx={8} cy={8} fill="#30c39f" r={2} />
          </svg>
          <span>g</span>
        </div>
        <div className="flex items-center gap-1">
          <svg width="16" height="16">
            <SquareShape cx={8} cy={8} fill="#ff7e00" r={2} />
          </svg>
          <span>r</span>
        </div>
        <div className="flex items-center gap-1">
          <svg width="16" height="16">
            <TriangleShape cx={8} cy={8} fill="#2af5ff" r={2} />
          </svg>
          <span>i</span>
        </div>
        <div className="flex items-center gap-1">
          <svg width="16" height="16">
            <FlippedTriangleShape cx={8} cy={8} fill="#2af5ff" r={2} />
          </svg>
          <span>z</span>
        </div>
        <div className="flex items-center gap-1">
          <svg width="16" height="16">
            <AsteriskShape cx={8} cy={8} fill="#fdc900" r={2} />
          </svg>
          <span>y</span>
        </div>
      </div>
    </div>
  </div>
);

function ObservingConditionsApplet({
  exposuresLoading,
  exposureFields,
  almanacLoading,
  almanacInfo,
}) {
  // const isMobile = useIsMobile();

  const data = exposureFields.map((entry) => {
    const obsStart = entry["obs_start"];
    let obs_start_dt = undefined;
    if (typeof obsStart === "string" && DateTime.fromISO(obsStart).isValid) {
      obs_start_dt = DateTime.fromISO(obsStart).toMillis();
    }
    return { ...entry, obs_start_dt };
  });

  const chartData = data
    .filter((d) => typeof d.obs_start_dt === "number" && !isNaN(d.obs_start_dt))
    .sort((a, b) => a.obs_start_dt - b.obs_start_dt);

  const twilightValues = almanacInfo
    .map((dayobsAlm) => {
      const eve = DateTime.fromFormat(
        dayobsAlm.twilight_evening,
        "yyyy-MM-dd HH:mm:ss",
      ).toMillis();
      const mor = DateTime.fromFormat(
        dayobsAlm.twilight_morning,
        "yyyy-MM-dd HH:mm:ss",
      ).toMillis();
      return [eve, mor];
    })
    .flat();

  const xVals = chartData
    .map((d) => d.obs_start_dt)
    .filter((v) => typeof v === "number" && !isNaN(v));
  const allXVals = [...xVals, ...twilightValues];
  const xMin = xVals.length ? Math.min(...allXVals) : "auto";
  const xMax = xVals.length ? Math.max(...allXVals) : "auto";

  // console.log(allXVals);
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

  // almanacInfo.forEach((dayobsAlm, i) => {
  //   const eveRaw = dayobsAlm.twilight_evening;
  //   const morRaw = dayobsAlm.twilight_morning;
  //   const eve = DateTime.fromFormat(eveRaw, "yyyy-MM-dd HH:mm:ss");
  //   const mor = DateTime.fromFormat(morRaw, "yyyy-MM-dd HH:mm:ss");
  //   console.log(
  //     `Day ${i}: evening=${eveRaw} - ${eve} (${eve.isValid}), morning=${morRaw} ${mor}(${mor.isValid})`,
  //   );
  // });

  // Calculate open/close shutter time or observing gaps
  const gapAreas = [];
  for (let i = 0; i < chartData.length - 1; i++) {
    const curr = chartData[i];
    const next = chartData[i + 1];
    const delta = next.obs_start_dt - curr.obs_start_dt;

    if (GAP_THRESHOLD < delta && delta < GAP_MAX_THRESHOLD) {
      gapAreas.push({
        start: curr.obs_start_dt,
        end: next.obs_start_dt,
      });
    }
  }

  //group data by dayobs to handle multiple nights
  const groupedByDayobs = Object.groupBy(chartData, (exp) => exp.day_obs);
  const groupedChartData = Object.values(groupedByDayobs);
  // console.log("Grouped by day_obs:", groupedChartData);

  const filterByBand = (data, band) => {
    return data.map((d) => {
      if (d.band !== band) {
        return { ...d, zero_point_median: null };
      }
      return d;
    });
  };

  const dataWithNightGaps = (data, band) => {
    return data.flatMap((group, i) => {
      const filtered = filterByBand(group, band);
      if (i === 0) return filtered;

      return [{ obs_start_dt: null, zero_point_median: null }, ...filtered];
    });
  };
  // const filteredChartData = groupedChartData.map(group => filterByBand(group, 'u'));
  // console.log("Filtered chart data for band 'u':", filteredChartData);

  // const testData = [{
  //   obs_start_dt: DateTime.fromISO("2023-10-01T00:00:00Z").toMillis(),
  //   band: "u",
  //   zero_point_median: 20.5,
  //   day_obs: "2023-10-01",
  // }, {
  //   obs_start_dt: DateTime.fromISO("2023-10-01T01:00:00Z").toMillis(),
  //   band: "g",
  //   zero_point_median: 21.0,
  //   day_obs: "2023-10-01",
  // }, {
  //   obs_start_dt: DateTime.fromISO("2023-10-01T02:00:00Z").toMillis(),
  //   band: "r",
  //   zero_point_median: 19.8,
  //   day_obs: "2023-10-01",
  // }, {
  //   obs_start_dt: DateTime.fromISO("2023-10-01T03:00:00Z").toMillis(),
  //   band: "i",
  //   zero_point_median: 20.2,
  //   day_obs: "2023-10-01",
  // }, {
  //   obs_start_dt: DateTime.fromISO("2023-10-01T04:00:00Z").toMillis(),
  //   band: "z",
  //   zero_point_median: 20.0,
  //   day_obs: "2023-10-01",
  // }, {
  //   obs_start_dt: DateTime.fromISO("2023-10-01T05:00:00Z").toMillis(),
  //   band: "y",
  //   zero_point_median: 20.3,
  //   day_obs: "2023-10-01",
  // }, {
  //   obs_start_dt: DateTime.fromISO("2023-10-01T06:00:00Z").toMillis(),
  //   band: "u",
  //   zero_point_median: 20.1,
  //   day_obs: "2023-10-01",
  // }, {
  //   obs_start_dt: DateTime.fromISO("2023-10-01T07:00:00Z").toMillis(),
  //   band: "g",
  //   zero_point_median: 21.2,
  //   day_obs: "2023-10-01",
  // }, {
  //   obs_start_dt: DateTime.fromISO("2023-10-01T08:00:00Z").toMillis(),
  //   band: "r",
  //   zero_point_median: 19.9,
  //   day_obs: "2023-10-01",
  // }, {
  //   obs_start_dt: DateTime.fromISO("2023-10-01T09:00:00Z").toMillis(),
  //   band: "i",
  //   zero_point_median: 20.4,
  //   day_obs: "2023-10-01",
  // }, {
  //   obs_start_dt: DateTime.fromISO("2023-10-01T10:00:00Z").toMillis(),
  //   band: "z",
  //   zero_point_median: 20.1,
  //   day_obs: "2023-10-01",
  // }, {
  //   obs_start_dt: DateTime.fromISO("2023-10-01T11:00:00Z").toMillis(),
  //   band: "y",
  //   zero_point_median: 20.5,
  //   day_obs: "2023-10-01",
  // }]

  // const groups = Object.groupBy(testData, (d) => d.day_obs || "unknown");
  // const groupedTesData = Object.values(groups);

  // console.log("Test Grouped by day_obs:", groupedTesData);
  // console.log("Grouped test data, u band:", groupedTesData.map(group => filterByBand(group, 'u')));

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
        {exposuresLoading || almanacLoading ? (
          <div className="flex-grow">
            <Skeleton className="w-full h-full min-h-[180px] bg-stone-900" />
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row items-stretch w-full h-full gap-2 overflow-hidden">
            <div className="flex-grow min-w-0 h-full">
              <ChartContainer config={chartConfig} className="w-full h-full">
                {/* <ResponsiveContainer width="100%" height="100%"> */}
                <ComposedChart
                  margin={{ left: 20, right: 10, top: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#555" />
                  <XAxis
                    data={chartData}
                    dataKey="obs_start_dt"
                    type="number"
                    domain={[xMin, xMax]}
                    scale="time"
                    ticks={xTicks}
                    tickFormatter={(tick) =>
                      DateTime.fromMillis(tick).toFormat("HH:mm")
                    }
                    tick={{ fill: "white" }}
                    label={{
                      value: "Time (TAI)",
                      position: "bottom",
                      fill: "white",
                      dy: -10,
                    }}
                    padding={{ left: 10, right: 10 }}
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
                      dx: 15,
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
                      dx: -20,
                      fill: "white",
                    }}
                  />
                  {/* <ZAxis dataKey="zero_point_median" range={[20, 20]} /> */}
                  {twilightValues.map((twi, i) =>
                    typeof twi === "number" &&
                    !isNaN(twi) &&
                    xMin <= twi &&
                    twi <= xMax ? (
                      <ReferenceLine
                        key={`twilight-${i}-${twi}`}
                        x={twi}
                        stroke="#3eb7ff"
                        // label={{
                        //   value: `twilight ${i}`,
                        //   angle: 90,
                        //   position: "insideTopLeft",
                        //   // fill: "white",
                        //   dx: 7,
                        // }}
                        yAxisId="left"
                        strokeDasharray="5 5"
                      />
                    ) : null,
                  )}

                  <ChartTooltip
                    content={<CustomTooltip />}
                    cursor={{ strokeDasharray: "3 3", stroke: "#ffffff" }}
                  />
                  {/* <Line
                    name="zero_point_median_u"
                    yAxisId="right"
                    type="monotone"
                    dataKey="zero_point_median"
                    dot={{ r: 1, fill: "#3eb7ff", stroke: "#3eb7ff" }}
                    data={chartData.map((d) => ({
                      ...d,
                      zero_point_median:
                        d.band === "u" ? d.zero_point_median : null,
                      obs_start_dt: d.band === "u" ? d.obs_start_dt : null,
                    }))}
                    isAnimationActive={false}
                  /> */}
                  {/* {groupedChartData.map((group, i) => (
                    <Line
                      key={`zero_point_median_u-${i}`}
                      name="zero_point_median_u"
                      yAxisId="right"
                      type="monotone"
                      dataKey="zero_point_median"
                      dot={{ r: 1, fill: "#3eb7ff", stroke: "#3eb7ff" }}
                      data={filterByBand(group, "u")}
                      isAnimationActive={false}
                    />
                  ))} */}
                  <Line
                    name="zero_point_median_u"
                    yAxisId="right"
                    type="monotone"
                    dataKey="zero_point_median"
                    dot={{ r: 1, fill: "#3eb7ff", stroke: "#3eb7ff" }}
                    data={dataWithNightGaps(groupedChartData, "u")}
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
                    data={dataWithNightGaps(groupedChartData, "g")}
                    isAnimationActive={false}
                  />
                  {/* {groupedChartData.map((group, i) => (
                    <Line
                      key={`zero_point_median_r-${i}`}
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
                      data={filterByBand(group, "r")}
                      isAnimationActive={false}
                    />
                  ))} */}
                  {/* <Line
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
                      if (d.band !== "g") {
                        return { ...d, zero_point_median: null };
                      }
                      return d;
                    })}
                    isAnimationActive={false}
                  /> */}
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
                    data={dataWithNightGaps(groupedChartData, "r")}
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
                      line
                      data={dataWithNightGaps(groupedChartData, "r")}
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
                    data={dataWithNightGaps(groupedChartData, "i")}
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
                    data={dataWithNightGaps(groupedChartData, "z")}
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
                    data={dataWithNightGaps(groupedChartData, "y")}
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
                  {gapAreas.map((gap, i) => (
                    <ReferenceArea
                      key={`gap-${i}`}
                      x1={gap.start}
                      x2={gap.end}
                      yAxisId="left"
                      strokeOpacity={0}
                      fill="#147570ff"
                      fillOpacity={0.5}
                      // label={{
                      //   value: "Gap > 5min",
                      //   position: "insideTopLeft",
                      //   fill: "#FFAAAA",
                      //   fontSize: 10,
                      // }}
                    />
                  ))}

                  {/* <ChartLegend
                    layout={isMobile ? "horizontal" : "vertical"}
                    verticalAlign={isMobile ? "bottom" : "middle"}
                    align={isMobile ? "center" : "right"}
                    content={renderCustomLegend}
                  /> */}
                </ComposedChart>
                {/* </ResponsiveContainer> */}
              </ChartContainer>
            </div>
            {/* Legend Area */}
            <div className="w-full h-full lg:w-32 mr-2">
              {renderCustomLegend()}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
// TODO: Check tooltip behavior
// TODO: Use the legend to show/hide bands
// TODO: Use callback on click to get the data for the clicked point
// TODO: check other callbacks like onMouseEnter,
// onMouseLeave, onMouseUp, onMouseDown, onMouseMove
// DONE: Use different(multi) series for each band
// Done: Didn't work, Use multi series for multi nights
// DONE: check builtin shapes in recharts
// DONE: Try connect nulls
// TODO: try scatter with line rather than line with dots
// TODO: Update tooltip to show band, full date value
// TODO: update tooltip style
// TODO: Update legend style
// DONE: Add twilight reference lines for multiple nights
// Done: Didn't work, use segments to draw lines between points
// (to remove possible cross lines between nights
// if last and first points are of the same band)
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
