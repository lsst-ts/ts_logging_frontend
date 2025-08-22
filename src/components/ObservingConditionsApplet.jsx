import React, { useMemo } from "react";
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
import { BAND_COLORS } from "@/components/PLOT_DEFINITIONS";

import { DEFAULT_PIXEL_SCALE_MEDIAN, PSF_SIGMA_FACTOR } from "@/utils/utils";

// Constants for gap detection
const GAP_THRESHOLD = 5 * 60 * 1000;
const ISO_DATETIME_FORMAT = "yyyy-MM-dd HH:mm:ss";

const CustomTooltip = ({ active, payload, label }) => {
  const dataKeyTitles = {
    psf_median: "PSF FWHM",
    zero_point_median: "Zero Point Median",
  };

  if (!active || !payload || !payload.length) return null;

  const tooltipData = [];
  const seenKeys = new Set(); // Only add one entry for zero_point_median, showing its value and band

  payload.forEach((entry) => {
    const key = entry.dataKey;
    if (
      entry.value !== null &&
      entry.value !== undefined &&
      dataKeyTitles[entry.dataKey] &&
      !seenKeys.has(key)
    ) {
      tooltipData.push({
        name: dataKeyTitles[entry.dataKey],
        value:
          typeof entry.value === "number"
            ? entry.value.toFixed(2)
            : entry.value,
        color: entry.color,
      });
      seenKeys.add(key);
    }
  });

  if (!tooltipData.length) return null;

  // Add other information from the payload
  const staticFields = [
    { key: "band", name: "Band" },
    { key: "exposure_id", name: "Exposure ID" },
    { key: "seq_num", name: "Seq Num" },
    { key: "science_program", name: "Science Program" },
    { key: "observation_reason", name: "Observation Reason" },
  ];

  staticFields.forEach(({ key, name }) => {
    tooltipData.push({
      name,
      value: payload[0].payload[key] ?? "N/A",
      color: "#ffffff",
    });
  });

  return (
    <div className="bg-white text-black text-xs p-2 border border-white rounded text-black font-light mb-1">
      <p>
        Obs Start:{" "}
        <span className="font-bold">
          {DateTime.fromMillis(label).toFormat(ISO_DATETIME_FORMAT)}
        </span>
      </p>
      {tooltipData.map((item, index) => (
        <p key={index}>
          {item.name}: <span className="font-bold">{item.value}</span>
        </p>
      ))}
    </div>
  );
};

// Custom legend to display band colors and shapes
const renderCustomLegend = (props) => (
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
        shutter closed (&gt; 5m)
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
      <div className="p-1 pr-1 border border-white grid grid-cols-2">
        <div
          className="flex flex-row items-center gap-1 pr-1"
          onMouseEnter={() =>
            props.onMouseEnter({ dataKey: "zero_point_median_u" })
          }
          onMouseLeave={() =>
            props.onMouseLeave({ dataKey: "zero_point_median_u" })
          }
        >
          <svg width="16" height="16">
            <circle cx="8" cy="8" r="2" fill={BAND_COLORS.u} />
          </svg>
          <span>u</span>
        </div>
        <div
          className="flex items-center gap-1 pr-1"
          onMouseEnter={() =>
            props.onMouseEnter({ dataKey: "zero_point_median_g" })
          }
          onMouseLeave={() =>
            props.onMouseLeave({ dataKey: "zero_point_median_g" })
          }
        >
          <svg width="16" height="16">
            <TriangleShape cx={8} cy={8} fill={BAND_COLORS.g} r={2} />
          </svg>
          <span>g</span>
        </div>
        <div
          className="flex items-center gap-1 pr-1"
          onMouseEnter={() =>
            props.onMouseEnter({ dataKey: "zero_point_median_r" })
          }
          onMouseLeave={() =>
            props.onMouseLeave({ dataKey: "zero_point_median_r" })
          }
        >
          <svg width="16" height="16">
            <FlippedTriangleShape cx={8} cy={8} fill={BAND_COLORS.r} r={2} />
          </svg>
          <span>r</span>
        </div>

        <div
          className="flex items-center gap-1 pr-1"
          onMouseEnter={() =>
            props.onMouseEnter({ dataKey: "zero_point_median_i" })
          }
          onMouseLeave={() =>
            props.onMouseLeave({ dataKey: "zero_point_median_i" })
          }
        >
          <svg width="16" height="16">
            <SquareShape cx={8} cy={8} fill={BAND_COLORS.i} r={2} />
          </svg>
          <span>i</span>
        </div>
        <div
          className="flex items-center gap-1 pr-1"
          onMouseEnter={() =>
            props.onMouseEnter({ dataKey: "zero_point_median_z" })
          }
          onMouseLeave={() =>
            props.onMouseLeave({ dataKey: "zero_point_median_z" })
          }
        >
          <svg width="16" height="16">
            <StarShape cx={8} cy={8} fill={BAND_COLORS.z} r={2} />
          </svg>
          <span>z</span>
        </div>
        <div
          className="flex items-center gap-1 pr-1"
          onMouseEnter={() =>
            props.onMouseEnter({ dataKey: "zero_point_median_y" })
          }
          onMouseLeave={() =>
            props.onMouseLeave({ dataKey: "zero_point_median_y" })
          }
        >
          <svg width="16" height="16">
            <AsteriskShape cx={8} cy={8} fill={BAND_COLORS.y} r={2} />
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
  const [hoveringBand, setHoveringBand] = React.useState(null); // to track the hovered band

  // opacity for each band based on hovering state
  // if hoveringBand is set, the opacity for that band is 1, otherwise it
  // is set to 0 to hide the line
  let uOpacity = hoveringBand && hoveringBand !== "zero_point_median_u" ? 0 : 1;
  let rOpacity = hoveringBand && hoveringBand !== "zero_point_median_r" ? 0 : 1;
  let yOpacity = hoveringBand && hoveringBand !== "zero_point_median_y" ? 0 : 1;
  let iOpacity = hoveringBand && hoveringBand !== "zero_point_median_i" ? 0 : 1;
  let zOpacity = hoveringBand && hoveringBand !== "zero_point_median_z" ? 0 : 1;
  let gOpacity = hoveringBand && hoveringBand !== "zero_point_median_g" ? 0 : 1;

  const handleMouseEnter = (payload) => {
    setHoveringBand(payload.dataKey);
  };

  const handleMouseLeave = () => {
    setHoveringBand(null);
  };

  const data = useMemo(
    () =>
      // fallback to empty array if exposureFields is undefined
      (exposureFields ?? []).map((entry) => {
        // Convert obs_start to a DateTime object and then to milliseconds
        const obsStart = entry["obs_start"];
        let obs_start_dt = undefined;
        if (
          typeof obsStart === "string" &&
          DateTime.fromISO(obsStart).isValid
        ) {
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
      }),
    [exposureFields],
  );

  // Filter out entries without obs_start_dt and sort by obs_start_dt
  // to ensure the data is in chronological order and omit crossing lines
  // between different nights/bands
  const isValidNumber = (value) => typeof value === "number" && !isNaN(value);

  const chartData = useMemo(
    () =>
      // fallback to empty array if data is undefined
      (data ?? [])
        .filter((d) => isValidNumber(d.obs_start_dt))
        .sort((a, b) => a.obs_start_dt - b.obs_start_dt),
    [data],
  );

  // retrieve twilight times from almanacInfo
  // and convert them to milliseconds
  const twilightValues = useMemo(
    () =>
      // fallback to empty array if almanacInfo is undefined
      (almanacInfo ?? [])
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
        .flat(),
    [almanacInfo],
  );

  const { xMin, xMax, xTicks } = useMemo(() => {
    // Filter out invalid observing times
    const xVals = chartData.map((d) => d.obs_start_dt).filter(isValidNumber);
    // add twilight values to xVals to make sure they are included in the chart
    const allXVals = [...xVals, ...twilightValues];
    // Calculate min and max for x-axis
    const min = xVals.length ? Math.min(...allXVals) : "auto";
    const max = xVals.length ? Math.max(...allXVals) : "auto";

    // Generate evenly spaced ticks between xMin and xMax
    let ticks = [];
    if (isValidNumber(min) && isValidNumber(max) && max > min) {
      const step = (max - min) / 9;
      for (let i = 0; i < 10; i++) {
        ticks.push(Math.round(min + i * step));
      }
    }
    return { xMin: min, xMax: max, xTicks: ticks };
  }, [chartData, twilightValues]);

  // Calculate min and max for y-axis (zero point median)
  const zeroPointVals = chartData
    .map((d) => d.zero_point_median)
    .filter(isValidNumber);
  // move the minimum value down by 5 for better visibility
  const zeroPointMedianMin = zeroPointVals.length
    ? Math.min(...zeroPointVals) - 5
    : "auto";

  const chartConfig = {
    psf_median: { label: "PSF FWHM", color: "#ffffff" },
    zero_point_median: { label: "Zero Point Median", color: "#3b82f6" },
  };

  const groupedByDayobs = useMemo(
    () => Object.groupBy(chartData, (exp) => exp.day_obs),
    [chartData],
  );

  const getDayobsAlmanac = (dayobs) => {
    if (almanacInfo && Array.isArray(almanacInfo)) {
      for (const dayObsAlm of almanacInfo) {
        if (parseInt(dayObsAlm.dayobs) === parseInt(dayobs) + 1)
          return dayObsAlm;
      }
    }
    return null;
  };
  // Calculate open/close shutter time or observing gaps
  const gapAreas = useMemo(() => {
    const gaps = [];
    for (const [dayobs, exps] of Object.entries(groupedByDayobs)) {
      for (let i = 0; i < exps.length; i++) {
        const curr = exps[i].obs_start_dt;
        // set the next time to the end of the dayobs almanac
        // if it is the last exposure of the dayobs
        // use twilight_morning as next time (if almanac is available)
        // otherwise use the current exp obs_start_dt (last gap will be zero)
        let next;
        if (i === exps.length - 1) {
          const dayobsAlm = getDayobsAlmanac(dayobs);
          next = dayobsAlm
            ? DateTime.fromFormat(
                dayobsAlm.twilight_morning,
                ISO_DATETIME_FORMAT,
              ).toMillis()
            : exps[i].obs_start_dt;
        } else {
          next = exps[i + 1].obs_start_dt;
        }

        const delta = next - curr;
        if (GAP_THRESHOLD < delta) {
          gaps.push({
            start: curr,
            end: next,
          });
        }
      }
    }
    return gaps;
  }, [groupedByDayobs]);

  //group data by dayobs to handle multiple nights
  const groupedChartData = useMemo(() => {
    return Object.values(groupedByDayobs);
  }, [chartData]);

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
              This chart visualizes Zero Point Median and PSF FWHM over the
              selected dayobs range. It uses the following data columns from
              ConsDB <code className="font-bold uppercase">exposure</code> and{" "}
              <code className="font-bold uppercase">visit1_quicklook</code>{" "}
              tables:
              <br />
              <br />
              <ul>
                <li>
                  -{" "}
                  <code className="font-bold uppercase">zero_point_median</code>{" "}
                  → for zero points, filtered by{" "}
                  <code className="font-bold uppercase">band</code>
                </li>
                <li>
                  -{" "}
                  <code className="font-bold uppercase">psf_sigma_median</code>{" "}
                  * 2.355 * [
                  <code className="font-bold uppercase">
                    pixel_scale_median
                  </code>{" "}
                  or 0.2] → to calculate seeing
                </li>
                <li>
                  - <code className="font-bold uppercase">obs_start</code> → for
                  time axis and detecting <strong>nighttime</strong> gaps (
                  <strong>&gt; 5min</strong>)
                </li>
              </ul>
              <br />
              Twilight periods (<strong>18 degree</strong>) are marked with blue
              dashed lines.
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
          <div className="h-full overflow-visible">
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
                  /* Y axis for PSF FWHM */
                  <YAxis
                    yAxisId="left"
                    tick={{ fill: "white" }}
                    domain={["auto", "auto"]}
                    tickFormatter={(tick) => Number(tick).toFixed(1)}
                    label={{
                      value: "PSF FWHM (arcsec)",
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
                    allowEscapeViewBox={{ x: true, y: true }}
                    offset={20}
                    wrapperStyle={{ opacity: 0.9 }}
                  />
                  /* line plots for zero point median filtered by band */
                  <Line
                    name="zero_point_median_u"
                    yAxisId="right"
                    type="monotone"
                    dataKey="zero_point_median"
                    dot={{
                      r: 1,
                      fill: BAND_COLORS.u,
                      stroke: BAND_COLORS.u,
                      strokeOpacity: uOpacity,
                      fillOpacity: uOpacity,
                    }}
                    strokeOpacity={uOpacity}
                    data={dataWithNightGaps(groupedChartData, "u")}
                    isAnimationActive={false}
                  />
                  <Line
                    name="zero_point_median_g"
                    yAxisId="right"
                    type="monotone"
                    dataKey="zero_point_median"
                    stroke={BAND_COLORS.g}
                    strokeOpacity={gOpacity}
                    dot={(props) => {
                      const { key, ...rest } = props;
                      return (
                        <TriangleShape
                          key={key}
                          {...rest}
                          fill={BAND_COLORS.g}
                          r={2}
                          strokeOpacity={gOpacity}
                          fillOpacity={gOpacity}
                        />
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
                    stroke={BAND_COLORS.r}
                    strokeOpacity={rOpacity}
                    dot={(props) => {
                      const { key, ...rest } = props;
                      return (
                        <FlippedTriangleShape
                          key={key}
                          {...rest}
                          fill={BAND_COLORS.r}
                          r={2}
                          strokeOpacity={rOpacity}
                          fillOpacity={rOpacity}
                        />
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
                    stroke={BAND_COLORS.i}
                    strokeOpacity={iOpacity}
                    dot={(props) => {
                      const { key, ...rest } = props;
                      return (
                        <SquareShape
                          key={key}
                          {...rest}
                          fill={BAND_COLORS.i}
                          r={2}
                          strokeOpacity={iOpacity}
                          fillOpacity={iOpacity}
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
                    stroke={BAND_COLORS.z}
                    strokeOpacity={zOpacity}
                    dot={(props) => {
                      const { key, ...rest } = props;
                      return (
                        <StarShape
                          key={key}
                          {...rest}
                          fill={BAND_COLORS.z}
                          r={2}
                          strokeOpacity={zOpacity}
                          fillOpacity={zOpacity}
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
                    stroke={BAND_COLORS.y}
                    strokeOpacity={yOpacity}
                    dot={(props) => {
                      const { key, ...rest } = props;
                      return (
                        <AsteriskShape
                          key={key}
                          {...rest}
                          fill={BAND_COLORS.y}
                          r={2}
                          strokeOpacity={yOpacity}
                          fillOpacity={yOpacity}
                        />
                      );
                    }}
                    data={dataWithNightGaps(groupedChartData, "y")}
                    isAnimationActive={false}
                  />
                  /* Scatter plot for PSF FWHM */
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
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
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
