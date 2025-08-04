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
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import { DateTime } from "luxon";
import { Skeleton } from "@/components/ui/skeleton";
import {
  XShape,
  TriangleShape,
  FlippedTriangleShape,
  SquareShape,
  StarShape,
  AsteriskShape,
} from "./plotDotShapes";

import { DEFAULT_PIXEL_SCALE_MEDIAN, PSF_SIGMA_FACTOR } from "@/utils/utils";

// Constants for gap detection
const GAP_THRESHOLD = 5 * 60 * 1000;
const GAP_MAX_THRESHOLD = 60 * 60 * 1000;
const ISO_DATETIME_FORMAT = "yyyy-MM-dd HH:mm:ss";

const CustomTooltip = ({ active, payload, label }) => {
  const variableTitles = {
    psf_median: "PSF Seeing",
    zero_point_median: "Zero Point Median",
  };
  // Check if the tooltip is active and has payload data
  if (active && payload && payload.length) {
    const uniqueData = new Map();
    // Iterate through the payload to extract unique data points
    // to avoid multiple tooltips
    payload.forEach((entry) => {
      if (entry.value !== null && entry.value !== undefined) {
        uniqueData.set(entry.dataKey, {
          name: variableTitles[entry.dataKey],
          value:
            typeof entry.value === "number"
              ? entry.value.toFixed(2)
              : entry.value,
          color: entry.color,
        });
      }
    });
    // Add band information
    if (uniqueData.size === 0) return null;
    uniqueData.set("Band", {
      name: "Band",
      value: payload[0].payload.band || "N/A",
      color: "#ffffff",
    });
    return (
      <div className="bg-white text-black text-xs p-2 border border-white rounded text-black font-bold mb-1">
        <p>
          Obs Start:{" "}
          <span className="font-light">
            {DateTime.fromMillis(label).toFormat(ISO_DATETIME_FORMAT)}
          </span>
        </p>
        {Array.from(uniqueData.values()).map((item, index) => (
          <p key={index}>
            {item.name}: <span className="font-light">{item.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Custom legend to display band colors and shapes
const renderCustomLegend = () => (
  <div className="w-24 h-fit flex-shrink-0">
    <div className="flex flex-wrap gap-1 px-4 py-2 bg-black shadow-[4px_4px_4px_0px_#c27aff] border text-white text-xxs justify-start ">
      <div className="flex items-center ml-0.5 gap-2">
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
        <span className="inline-block w-3 h-5 ml-1 mr-2 bg-teal-800 bg-opacity-90 border border-teal-900" />
        shutter closed (> 5m)
      </div>

      <div className="flex items-center gap-2">
        <svg width="16" height="16">
          <g>
            <XShape cx={8} cy={8} fill="#fff" />
          </g>
        </svg>
        <span>seeing</span>
      </div>

      <div className="w-full text-white mt-2 text-xxs">zero points</div>
      <div className="gap-1 p-1 pr-2 border border-white grid grid-cols-2">
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
  const data = exposureFields.map((entry) => {
    // Convert obs_start to a DateTime object and then to milliseconds
    const obsStart = entry["obs_start"];
    let obs_start_dt = undefined;
    if (typeof obsStart === "string" && DateTime.fromISO(obsStart).isValid) {
      obs_start_dt = DateTime.fromISO(obsStart).toMillis();
    }
    // calculate psf_median from psf_sigma_median and pixel_scale_median
    const psfSigma = entry["psf_sigma_median"];
    const pixelScale =
      entry["pixel_scale_median"] ?? DEFAULT_PIXEL_SCALE_MEDIAN;
    const psf_median = psfSigma
      ? psfSigma * PSF_SIGMA_FACTOR * pixelScale
      : null;
    return { ...entry, obs_start_dt, psf_median };
  });

  // Filter out entries without obs_start_dt and sort by obs_start_dt
  // to ensure the data is in chronological order and omit crossing lines
  // between different nights/bands
  const isValidNumber = (value) => typeof value === "number" && !isNaN(value);

  const chartData = data
    .filter((d) => isValidNumber(d.obs_start_dt))
    .sort((a, b) => a.obs_start_dt - b.obs_start_dt);

  // retrieve twilight times from almanacInfo
  // and convert them to milliseconds
  const twilightValues = almanacInfo
    .map((dayobsAlm) => {
      const eve = DateTime.fromFormat(
        dayobsAlm.twilight_evening,
        ISO_DATETIME_FORMAT,
      ).toMillis();
      const mor = DateTime.fromFormat(
        dayobsAlm.twilight_morning,
        ISO_DATETIME_FORMAT,
      ).toMillis();
      return [eve, mor];
    })
    .flat();

  // Filter out invalid observing times
  const xVals = chartData.map((d) => d.obs_start_dt).filter(isValidNumber);
  // add twilight values to xVals to make sure they are included in the chart
  const allXVals = [...xVals, ...twilightValues];
  // Calculate min and max for x-axis
  const xMin = xVals.length ? Math.min(...allXVals) : "auto";
  const xMax = xVals.length ? Math.max(...allXVals) : "auto";

  // Calculate min and max for y-axis (zero point median)
  const zeroPointVals = chartData
    .map((d) => d.zero_point_median)
    .filter(isValidNumber);
  // move the minimum value down by 5 for better visibility
  const zeroPointMedianMin = zeroPointVals.length
    ? Math.min(...zeroPointVals) - 5
    : "auto";

  // Generate evenly spaced ticks between xMin and xMax
  let xTicks = [];
  if (isValidNumber(xMin) && isValidNumber(xMax) && xMax > xMin) {
    const step = (xMax - xMin) / 9;
    for (let i = 0; i < 10; i++) {
      xTicks.push(Math.round(xMin + i * step));
    }
  }

  const chartConfig = {
    psf_median: { label: "PSF Seeing", color: "#ffffff" },
    zero_point_median: { label: "Zero Point Median", color: "#3b82f6" },
  };

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

  // Function to filter data by band
  // and return data with null values for other bands
  // This is used to create separate lines for each band
  const filterByBand = (data, band) => {
    return data.map((d) => {
      if (d.band !== band) {
        return { ...d, zero_point_median: null };
      }
      return d;
    });
  };
  // Function to add gaps for day time between dayobs
  // This will insert a null entry at the start of each group/dayobs
  // This is useful for visualizing the gaps between dayobs
  // and ensuring that the lines do not connect across nights
  const dataWithNightGaps = (data, band) => {
    return data.flatMap((group, i) => {
      const filtered = filterByBand(group, band);
      if (i === 0) return filtered;

      return [{ obs_start_dt: null, zero_point_median: null }, ...filtered];
    });
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
        {exposuresLoading || almanacLoading ? (
          <div className="flex-grow">
            <Skeleton className="w-full h-full min-h-[180px] bg-stone-900" />
          </div>
        ) : (
          <div className="h-full overflow-hidden">
            <div className="flex-grow min-w-0 h-full">
              <ChartContainer config={chartConfig} className="w-full h-full">
                <ComposedChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="#555" />
                  /* X axis for time */
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
                      value: "Observation Start Time (TAI)",
                      position: "bottom",
                      fill: "white",
                      dy: -10,
                    }}
                    padding={{ left: 10, right: 10 }}
                  />
                  /* Y axis for PSF Seeing */
                  <YAxis
                    yAxisId="left"
                    tick={{ fill: "white" }}
                    domain={["auto", "auto"]}
                    tickFormatter={(tick) => Number(tick).toFixed(1)}
                    label={{
                      value: "PSF Seeing (arcsec)",
                      angle: -90,
                      position: "insideLeft",
                      fill: "white",
                      dx: 0,
                      dy: 40,
                    }}
                    width={50}
                  />
                  /* Y axis for Zero Point Median */
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fill: "white" }}
                    domain={[zeroPointMedianMin, "auto"]}
                    label={{
                      value: "Zero Points (mag)",
                      angle: 90,
                      position: "insideRight",
                      dx: -10,
                      dy: 30,
                      fill: "white",
                    }}
                    width={50}
                  />
                  /* Shutter closed areas */
                  {gapAreas.map((gap, i) => (
                    <ReferenceArea
                      key={`gap-${i}`}
                      x1={gap.start}
                      x2={gap.end}
                      yAxisId="left"
                      strokeOpacity={0}
                      fill="#147570ff"
                      fillOpacity={0.4}
                    />
                  ))}
                  /* twilight reference lines */
                  {twilightValues.map((twi, i) =>
                    typeof twi === "number" &&
                    !isNaN(twi) &&
                    xMin <= twi &&
                    twi <= xMax ? (
                      <ReferenceLine
                        key={`twilight-${i}-${twi}`}
                        x={twi}
                        stroke="#3eb7ff"
                        yAxisId="left"
                        strokeDasharray="5 5"
                      />
                    ) : null,
                  )}
                  <ChartTooltip
                    content={<CustomTooltip />}
                    cursor={{ strokeDasharray: "3 3", stroke: "#ffffff" }}
                  />
                  /* line plots for zero point median filtered by band */
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
                  /* Scatter plot for PSF Seeing */
                  <Scatter
                    name="psf_median"
                    dataKey="psf_median"
                    fill="white"
                    shape={(props) => <XShape {...props} />}
                    yAxisId="left"
                    data={chartData}
                    isAnimationActive={false}
                  />
                  <ChartLegend
                    layout={"vertical"}
                    verticalAlign={"middle"}
                    align={"right"}
                    content={renderCustomLegend}
                  />
                </ComposedChart>
              </ChartContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ObservingConditionsApplet;
