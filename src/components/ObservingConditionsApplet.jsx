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
} from "recharts";
import { DateTime } from "luxon";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";

const XShape = (props) => {
  const { cx, cy, fill } = props;
  const size = 1.5;
  if (cx < size || cy < size) return null;
  return (
    <g>
      <line
        x1={cx - size}
        y1={cy - size}
        x2={cx + size}
        y2={cy + size}
        stroke={fill}
        strokeWidth={1}
      />
      <line
        x1={cx - size}
        y1={cy + size}
        x2={cx + size}
        y2={cy - size}
        stroke={fill}
        strokeWidth={1}
      />
    </g>
  );
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
                x2="18"
                y2="14"
                stroke="white"
                strokeWidth="1"
              />
              <line
                x1="2"
                y1="14"
                x2="18"
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
  <div className="flex flex-col gap-2 p-3 bg-neutral-700 rounded-lg text-white text-xxs ml-10 shrink-0">
    <div className="flex items-center gap-2">
      <svg width="16" height="12">
        <g>
          <line x1="0" y1="0" x2="12" y2="12" stroke="white" strokeWidth="1" />
          <line x1="0" y1="12" x2="12" y2="0" stroke="white" strokeWidth="1" />
        </g>
      </svg>
      <span>Seeing</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-4 h-1 bg-blue-500 rounded"></div>
      <span>Zero Point</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
      <span>Zero Point</span>
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
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={chartData}
                    margin={{ left: 20, right: 10, top: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#555" />
                    <XAxis
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
                        value: "Zero Point Median",
                        angle: 90,
                        position: "insideRight",
                        dx: 10,
                        fill: "white",
                      }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      name="zero_point_median"
                      yAxisId="right"
                      type="monotone"
                      dataKey="zero_point_median"
                      stroke="blue"
                      dot={false}
                      isAnimationActive={false}
                    />
                    <Scatter
                      name="zero_point_median"
                      yAxisId="right"
                      fill="blue"
                      dataKey="zero_point_median"
                    />
                    <Scatter
                      name="dimm_seeing"
                      dataKey="dimm_seeing"
                      fill="white"
                      shape={<XShape />}
                      yAxisId="left"
                    />
                    <ChartLegend
                      layout={isMobile ? "horizontal" : "vertical"}
                      verticalAlign={isMobile ? "bottom" : "top"}
                      align={isMobile ? "center" : "right"}
                      content={renderCustomLegend}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ObservingConditionsApplet;
