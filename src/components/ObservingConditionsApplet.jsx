import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import DownloadIcon from "../assets/DownloadIcon.svg";
import InfoIcon from "../assets/InfoIcon.svg";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "./ui/chart";
import {
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Scatter,
  Line,
  Tooltip,
} from "recharts";
import { DateTime } from "luxon";
import { Skeleton } from "@/components/ui/skeleton";

const XShape = (props) => {
  const { cx, cy, fill } = props;
  const size = 1.5;
  // Don't render if too close to edges
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

function ObservingConditionsApplet({ exposuresLoading, exposureFields }) {
  const chartData = exposureFields.map((entry) => {
    const obsStart = entry["obs_start"];

    let obs_start_dt = undefined; // Default to now if not valid
    if (typeof obsStart === "string" && DateTime.fromISO(obsStart).isValid) {
      obs_start_dt = DateTime.fromISO(obsStart).toMillis();
    }
    return {
      ...entry,
      obs_start_dt: obs_start_dt,
    };
  });
  // console.log(chartData);

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
              This is a placeholder for the download/export button. Once
              implemented, clicking here will download this Applet's data to a
              .csv file.
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger className="self-end min-w-4">
              <img src={InfoIcon} />
            </PopoverTrigger>
            <PopoverContent className="bg-black text-white text-sm border-yellow-700 w-[300px]">
              This applet displays a summary of the observing conditions for the
              selected date range and instrument.
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 bg-black p-4 text-neutral-200 rounded-sm border-2 border-teal-900 h-[320px] font-thin">
        {exposuresLoading ? (
          <>
            {/* Skeleton outline */}
            {/* Plot display */}
            <div className="flex-grow flex flex-row gap-8 overflow-hidden">
              {/* Plot display */}
              <div className="flex-grow flex flex-col overflow-hidden">
                <div className="flex-grow overflow-y-auto">
                  <Skeleton className="w-full h-full min-h-[180px] bg-stone-900" />
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div
              className="flex flex-row items-stretch w-full h-[280px] gap-2"
              style={{ overflow: "visible" }}
            >
              {/* Chart area */}
              <div
                className="flex-shrink-0"
                style={{ width: 340, height: 280 }}
              >
                <ChartContainer
                  config={{}}
                  className="w-full h-full !aspect-auto"
                >
                  <ComposedChart
                    data={chartData}
                    margin={{ left: 20, right: 10, top: 10 }}
                    width={340}
                    height={280}
                  >
                    <Tooltip
                      isAnimationActive={false}
                      contentStyle={{
                        background: "#222",
                        border: "1px solid #888",
                        color: "#fff",
                        fontSize: "0.9em",
                      }}
                      labelStyle={{ color: "#fff" }}
                      formatter={(value, name) => [
                        typeof value === "number" ? value.toFixed(2) : value,
                        name,
                      ]}
                    />
                    <defs>
                      <clipPath id="chart-area-clip">
                        <rect x="0" y="0" width={340} height={280} />
                      </clipPath>
                    </defs>
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
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="zero_point_median"
                      stroke="blue"
                      dot={false}
                      isAnimationActive={false}
                    />
                    <Scatter
                      yAxisId="right"
                      fill="blue"
                      dataKey="zero_point_median"
                      clipPath="url(#chart-area-clip)"
                    />
                    <Scatter
                      dataKey="dimm_seeing"
                      fill="white"
                      shape={<XShape />}
                      yAxisId="left"
                      clipPath="url(#chart-area-clip)"
                    />
                  </ComposedChart>
                </ChartContainer>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default ObservingConditionsApplet;
