import { useEffect, useState } from "react";

import { DateTime } from "luxon";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { useSearch } from "@tanstack/react-router";

import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

import PlotVisibilityPopover from "@/components/PlotVisibilityPopover";
import PlotFormatPopover from "@/components/PlotFormatPopover";

import {
  PLOT_DEFINITIONS,
  PLOT_COLOR_OPTIONS,
  BAND_COLORS,
} from "@/components/PLOT_DEFINITIONS";
import { TELESCOPES } from "@/components/parameters";
import {
  TriangleShape,
  FlippedTriangleShape,
  SquareShape,
  StarShape,
  AsteriskShape,
} from "@/components/plotDotShapes";

import {
  fetchAlmanac,
  fetchDataLogEntriesFromConsDB,
} from "@/utils/fetchUtils";
import { getDatetimeFromDayobsStr } from "@/utils/utils";
import {
  isoToTAI,
  dayobsToTAI,
  almanacDayobsForPlot,
  millisToDateTime,
  millisToHHmm,
  utcDateTimeStrToTAIMillis,
} from "@/utils/timeUtils";

// import offlineResponse from "@/assets/dataLog_Simonyi_20250722_20250723.json";
// import offlineResponse from "@/assets/dataLog_Simonyi_0721_0723_wAlmanac.json";

// TODO: Move to utils as it is being defined here and in PlotVisibilityPopover.
function prettyTitleFromKey(key) {
  return key
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// Small vertical lines to represent exposures in the timeline
const CustomisedDot = ({ cx, cy, stroke, h, w }) => {
  if (cx == null || cy == null) return null;

  // Defaults
  const height = h || 2;
  const width = w || 1;
  const halfHeight = height / 2;
  const halfWidth = width / 2;
  const fill = stroke || "#3CAE3F";

  return (
    <svg x={cx - halfWidth} y={cy - halfHeight} width={width} height={height}>
      <rect x={0} y={0} width={width} height={height} fill={fill} />
    </svg>
  );
};

// TODO: Fix error using this component
// Band markers for the timeseries plots
const CustomisedDotWithShape = ({ cx, cy, band, r = 2 }) => {
  if (cx == null || cy == null) return null;

  // Band "u" is a blue circle
  if (band === "u") {
    return <circle cx={cx} cy={cy} r={r || 2} fill={BAND_COLORS.u} />;
  }

  // Choose shape based on prop
  let ShapeComponent;
  switch (band) {
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
  }

  return <ShapeComponent cx={cx} cy={cy} r={r} />;
};

function Timeline({
  data,
  twilightValues,
  illumValues,
  moonIntervals,
  fullTimeRange,
  selectedTimeRange,
  setSelectedTimeRange,
  staticTicks,
}) {
  const [refAreaLeft, setRefAreaLeft] = useState(null);
  const [refAreaRight, setRefAreaRight] = useState(null);

  // Convert datetime inputs to millis format for plots ====
  const xMinMillis = fullTimeRange[0]?.toMillis();
  const xMaxMillis = fullTimeRange[1]?.toMillis();
  const selectedMinMillis = selectedTimeRange[0]?.toMillis();
  const selectedMaxMillis = selectedTimeRange[1]?.toMillis();

  if (!xMinMillis || !xMaxMillis) return null;
  // --------------------------------------------------------

  // TODO: Move these to utils
  // Click & Drag Functionality =============================
  // Handle click+drag and set state accordingly
  const handleMouseDown = (e) => setRefAreaLeft(e?.activeLabel ?? null);
  const handleMouseMove = (e) =>
    refAreaLeft && setRefAreaRight(e?.activeLabel ?? null);
  const handleMouseUp = () => {
    if (!refAreaLeft || !refAreaRight || refAreaLeft === refAreaRight) {
      setRefAreaLeft(null);
      setRefAreaRight(null);
      return;
    }
    // Swap start/end if user dragged backwards
    const [startMillis, endMillis] =
      refAreaLeft < refAreaRight
        ? [refAreaLeft, refAreaRight]
        : [refAreaRight, refAreaLeft];

    // Convert millis to DateTime objects
    const startDT = millisToDateTime(startMillis);
    const endDT = millisToDateTime(endMillis);
    setSelectedTimeRange([startDT, endDT]);
    setRefAreaLeft(null);
    setRefAreaRight(null);
  };
  const handleDoubleClick = () => {
    setSelectedTimeRange(fullTimeRange);
  };
  // --------------------------------------------------------

  // Axis Utils =============================================
  // TAI xAxis ticks
  const generateHourlyTicks = (startMillis, endMillis, intervalHours = 1) => {
    const ticks = [];

    // Get start of first hour and end of last hour on timeline
    let t = millisToDateTime(startMillis).startOf("hour");
    const endDt = millisToDateTime(endMillis).endOf("hour");

    // Loop through timeline, collecting hours
    while (t <= endDt) {
      ticks.push(t.toMillis());
      t = t.plus({ hours: intervalHours });
    }
    return ticks;
  };
  const hourlyTicks = generateHourlyTicks(xMinMillis, xMaxMillis, 1);

  // Dayobs and moon illuminations labels along xAxis
  // Show vertical lines at midday dayobs borders
  // Show dayobs/illumination labels at midnights (UTC/Chile)
  const renderDayobsTicks = ({ x, y, payload }) => {
    const value = payload.value;
    const dt = millisToDateTime(value);

    const hourUTC = dt.hour;
    const isMiddayUTC = hourUTC === 12;
    const isMidnightUTC = hourUTC === 0;

    const DIST_BELOW_xAXIS = 10;
    const LABEL_TEXT_SIZE = 16;

    // Lines at midday dayobs borders
    if (isMiddayUTC) {
      return (
        <line
          x1={x}
          y1={y - PLOT_HEIGHT + DIST_BELOW_xAXIS}
          x2={x}
          y2={y + DIST_BELOW_xAXIS}
          stroke="grey"
        />
      );
    }

    // Dayobs labels
    if (isMidnightUTC) {
      // TODO: Make into timeUtil (apply to below, also)
      // Get date prior to midnight
      const dayobsLabel = dt.minus({ minutes: 1 }).toFormat("yyyy-LL-dd");

      return (
        <>
          <text
            x={x}
            y={y + DIST_BELOW_xAXIS}
            fontSize={LABEL_TEXT_SIZE}
            textAnchor="middle"
            fill="grey"
            style={{ WebkitUserSelect: "none" }}
          >
            {dayobsLabel}
          </text>
        </>
      );
    }

    // Convert to Chilean local time
    const dtChile = dt.setZone("America/Santiago");
    const isMidnightChile = dtChile.hour === 0;

    // Moon illumincation labels
    // Illumination data is retrieved at midnight Chilean time
    // so it makes sense to display value at that time.
    if (isMidnightChile) {
      // Get date prior to midnight
      const dayobs = dtChile.minus({ minutes: 1 }).toFormat("yyyyLLdd");
      // Find illumination by matching dayobs timestamp
      const illumEntry = illumValues.find((entry) => entry.dayobs === dayobs);
      // Get label
      const illumLabel = illumEntry?.illum ?? null;

      const DIST_FROM_xAXIS = 85; // distance from xAxis to label
      const xOffset = 10; // offset between moon symbol and label
      const MOON_RADIUS = 6;

      return (
        <>
          {illumLabel && (
            <>
              {/* Moon symbol */}
              <g
                transform={`translate(${x - xOffset}, ${
                  y - DIST_FROM_xAXIS - MOON_RADIUS
                })`}
              >
                <circle cx={0} cy={0} r={MOON_RADIUS} fill="white" />
                <circle
                  cx={MOON_RADIUS / 2}
                  cy={-MOON_RADIUS / 2}
                  r={MOON_RADIUS}
                  fill="#27272a"
                />
              </g>
              {/* Illumination value */}
              <text
                x={x + xOffset}
                y={y - DIST_FROM_xAXIS}
                fontSize={LABEL_TEXT_SIZE}
                fontWeight={100}
                letterSpacing={0.5}
                fill="white"
                textAnchor="middle"
                style={{ userSelect: "none" }}
              >
                {illumLabel}
              </text>
            </>
          )}
        </>
      );
    }

    return null;
  };

  const PLOT_HEIGHT = twilightValues.length > 1 ? 110 : 70;
  const PLOT_LABEL_HEIGHT = 20; // height of the top padding & xAxis label
  // --------------------------------------------------------

  // Timeline ===============================================
  return (
    <ResponsiveContainer
      title="Time Window Selector"
      config={{}}
      width="100%"
      height={PLOT_HEIGHT}
    >
      <LineChart
        width="100%"
        height={PLOT_HEIGHT}
        data={data}
        margin={{ top: PLOT_LABEL_HEIGHT, right: 30, left: 30, bottom: 0 }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      >
        {/* Timeline */}
        <ReferenceLine y={0.5} stroke="white" strokeWidth={1.5} />
        {/* Vertical lines on the hour */}
        {hourlyTicks.map((tick) => (
          <ReferenceLine key={tick} x={tick} stroke="white" opacity={0.1} />
        ))}
        {/* Dayobs & Moon Illumination labels and lines */}
        {twilightValues.length > 1 && (
          <XAxis
            xAxisId="dayobs"
            dataKey="obs_start_millis"
            domain={
              staticTicks
                ? [xMinMillis, xMaxMillis]
                : [selectedMinMillis, selectedMaxMillis]
            }
            allowDataOverflow
            type="number"
            scale="time"
            ticks={hourlyTicks}
            interval={staticTicks && 0}
            axisLine={false}
            tickLine={false}
            tick={staticTicks && renderDayobsTicks}
            height={PLOT_LABEL_HEIGHT}
          />
        )}
        {/* TAI Time Axis */}
        <XAxis
          dataKey="obs_start_millis"
          domain={
            staticTicks
              ? [xMinMillis, xMaxMillis]
              : [selectedMinMillis, selectedMaxMillis]
          }
          allowDataOverflow={true}
          type="number"
          scale="time"
          tick={false}
          axisLine={false}
          fontSize="20"
        />
        <YAxis hide domain={[0, 1]} />
        {/* Moon Up Area */}
        {moonIntervals.map(([start, end], i) => (
          <ReferenceArea
            key={`moon-up-${i}`}
            x1={start}
            x2={end}
            fillOpacity={0.2}
            fill="#EAB308"
            yAxisId="0"
          />
        ))}
        {/* Twilight lines and times */}
        {twilightValues.map((twi, i) =>
          xMinMillis <= twi && twi <= xMaxMillis ? (
            <ReferenceLine
              key={`twilight-${i}-${twi}`}
              x={twi}
              stroke="#0ea5e9"
              strokeWidth={3}
              yAxisId="0"
              label={{
                value: `${millisToHHmm(twi)}`,
                position: "bottom",
                fill: "white",
                dy: 5,
                fontSize: 16,
                fontWeight: 100,
                letterSpacing: 0.5,
                style: { userSelect: "none" },
              }}
            />
          ) : null,
        )}
        {/* Selection area (shaded background) shown once time window selection made */}
        {selectedMinMillis && selectedMaxMillis ? (
          <ReferenceArea
            x1={selectedMinMillis}
            x2={selectedMaxMillis}
            stroke="none"
            fillOpacity={0.2}
          />
        ) : null}
        {/* Points representing exposures and related data */}
        <Line
          dataKey={() => 0.5}
          stroke="#FFFFFF"
          type="linear"
          dot={<CustomisedDot stroke="#3CAE3F" h="20" w="1" />}
          isAnimationActive={false}
        />
        {/* Selection area (rectangle outline) shown once time window selection made */}
        {selectedMinMillis && selectedMaxMillis ? (
          <ReferenceArea
            x1={selectedMinMillis}
            x2={selectedMaxMillis}
            stroke="hotPink"
            fillOpacity={0}
          />
        ) : null}
        {/* Selection rectangle shown during active highlighting */}
        {refAreaLeft && refAreaRight ? (
          <ReferenceArea
            x1={refAreaLeft}
            x2={refAreaRight}
            fillOpacity={0.3}
            fill="pink"
          />
        ) : null}
      </LineChart>
    </ResponsiveContainer>
  );
}

function TimeseriesPlot({
  title,
  unit = null,
  dataKey,
  data,
  preferredYDomain = null,
  twilightValues,
  moonIntervals = [],
  fullTimeRange,
  selectedTimeRange,
  setSelectedTimeRange,
  plotShape,
  plotColor,
  bandMarker,
  isBandPlot = false,
  plotIndex = 0,
}) {
  const [refAreaLeft, setRefAreaLeft] = useState(null);
  const [refAreaRight, setRefAreaRight] = useState(null);
  const selectedMinMillis = selectedTimeRange[0]?.toMillis();
  const selectedMaxMillis = selectedTimeRange[1]?.toMillis();

  // Get color, either from options or generated based on index (for assorted colors)
  const selectedColor =
    plotColor === "assorted"
      ? `hsl(${plotIndex * 40}, 70%, 50%)`
      : PLOT_COLOR_OPTIONS.find((c) => c.key === plotColor)?.color || "#ffffff";

  // Click & Drag Functionality =============================
  // Handle click+drag and set state accordingly
  const handleMouseDown = (e) => setRefAreaLeft(e?.activeLabel ?? null);
  const handleMouseMove = (e) =>
    refAreaLeft && setRefAreaRight(e?.activeLabel ?? null);
  const handleMouseUp = () => {
    if (!refAreaLeft || !refAreaRight || refAreaLeft === refAreaRight) {
      setRefAreaLeft(null);
      setRefAreaRight(null);
      return;
    }
    // Swap start/end if user dragged backwards
    const [startMillis, endMillis] =
      refAreaLeft < refAreaRight
        ? [refAreaLeft, refAreaRight]
        : [refAreaRight, refAreaLeft];

    // Convert millis to DateTime objects
    const startDT = millisToDateTime(startMillis);
    const endDT = millisToDateTime(endMillis);
    setSelectedTimeRange([startDT, endDT]);
    setRefAreaLeft(null);
    setRefAreaRight(null);
  };
  const handleDoubleClick = () => {
    setSelectedTimeRange(fullTimeRange);
  };
  // --------------------------------------------------------

  // TODO: is this still being applied? ====================
  // Check if data is empty
  const actualValues = data.map((d) => d[dataKey]).filter((v) => v != null);
  // Check if all points are within preferred yDomain
  const isWithinPreferredDomain =
    preferredYDomain &&
    actualValues.length > 0 &&
    actualValues.every(
      (val) => val >= preferredYDomain[0] && val <= preferredYDomain[1],
    );
  // If data overflows preferred domain, use "auto" for Y axis
  const finalYDomain = isWithinPreferredDomain
    ? preferredYDomain
    : ["auto", "auto"];
  // --------------------------------------------------------

  // Compute decimal places for y-axis ticks ================
  const values = data.map((d) => d[dataKey]).filter((v) => v != null);
  // Get min/max
  const minVal = values.length > 0 ? Math.min(...values) : null;
  const maxVal = values.length > 0 ? Math.max(...values) : null;
  // Get yRange
  const yRange = minVal !== null && maxVal !== null ? maxVal - minVal : 0;
  // Decide decimal places based on yRange
  let decimalPlaces = 3;
  if (yRange > 5) decimalPlaces = 0;
  else if (yRange > 1.5) decimalPlaces = 1;
  else if (yRange > 0.01) decimalPlaces = 2;
  else if (yRange == 0) decimalPlaces = 0;
  // ---------------------------------------------------------

  // Plot Formatting =========================================
  const DOT_RADIUS = 2;
  let lineProps = {
    dataKey,
    activeDot: { r: 4, fill: "#ffffff" },
    isAnimationActive: false,
  };

  if (isBandPlot && bandMarker === "bandColorsIcons") {
    // Band markers (colours and icons)
    lineProps.stroke = "";
    lineProps.dot = ({ index, ...rest }) => (
      <CustomisedDotWithShape
        {...rest}
        key={`dot-${index}`}
        stroke={selectedColor}
        band={rest.payload.band}
        style={{ pointerEvents: "all" }}
      />
    );
  } else if (isBandPlot && bandMarker === "bandColor") {
    // Band markers (colours only)
    lineProps.stroke = "";
    lineProps.dot = ({ cx, cy, payload, index }) => {
      const fill = BAND_COLORS[payload.band] || selectedColor;
      if (cy == null) return null; // don't show a dot if undefined or null

      return (
        <circle
          key={`dot-${index}`}
          cx={cx}
          cy={cy}
          r={DOT_RADIUS}
          fill={fill}
          stroke={fill}
          style={{ pointerEvents: "all" }}
        />
      );
    };
  } else if (plotShape === "line") {
    // Lines
    lineProps.connectNulls = true;
    (lineProps.isAnimationActive = true), (lineProps.type = "linear");
    lineProps.stroke = selectedColor;
    lineProps.dot = false;
  } else {
    // Dots
    lineProps.stroke = "";
    lineProps.dot = {
      r: DOT_RADIUS,
      fill: selectedColor,
      stroke: selectedColor,
    };
  }
  // ---------------------------------------------------------

  // Plot =================================================
  return (
    <ChartContainer className="pt-8 h-50 w-full" title={title} config={{}}>
      <h1 className="text-white text-lg font-thin text-center">{title}</h1>
      <LineChart
        width={500}
        data={data}
        margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#555" />
        <XAxis
          dataKey="obs_start_millis"
          type="number"
          domain={[selectedMinMillis, selectedMaxMillis]}
          scale="time"
          tickFormatter={(tick) => millisToHHmm(tick)}
          tick={{ fill: "white", style: { userSelect: "none" } }}
        />
        <YAxis
          tick={{ fill: "white", style: { userSelect: "none" } }}
          tickFormatter={(value) => value.toFixed(decimalPlaces)}
          domain={finalYDomain}
          // domain={["auto", "auto"]}
          width={70}
          label={{
            value: unit,
            angle: -90,
            position: "insideLeft",
            fill: "white",
            dx: 0,
            dy: 30,
            fontSize: 16,
            fontWeight: 100,
            letterSpacing: 1,
          }}
        />
        {/* Moon Up Area */}
        {moonIntervals.map(([start, end], i) => (
          <ReferenceArea
            key={`moon-up-${i}`}
            x1={start}
            x2={end}
            fillOpacity={0.2}
            fill="#EAB308"
            yAxisId="0"
          />
        ))}
        {/* Twilight lines */}
        {twilightValues.map((twi, i) =>
          selectedMinMillis <= twi && twi <= selectedMaxMillis ? (
            <ReferenceLine
              key={`twilight-${i}-${twi}`}
              x={twi}
              stroke="#0ea5e9"
              strokeWidth={3}
              yAxisId="0"
            />
          ) : null,
        )}
        <ChartTooltip
          position={"topRight"}
          offset={50}
          allowEscapeViewBox={{ x: false, y: true }}
          content={(props) => (
            <ChartTooltipContent
              {...props}
              formatter={(value, name, item, index, payload) => {
                const exposureId = payload["exposure id"];
                const physicalFilter = payload["physical filter"];
                const scienceProgram = payload["science program"];
                const obsReason = payload["observation reason"];

                const formattedValue =
                  typeof value === "number" && !Number.isInteger(value)
                    ? value.toFixed(4)
                    : value;

                return (
                  <div className="flex flex-col gap-1 select-none">
                    <div>
                      <span className="text-muted-foreground">{title}:</span>{" "}
                      <span className="font-mono">{formattedValue}</span>
                    </div>
                    <hr className="m-1 text-cyan-700/50" />
                    <div>
                      <span className="text-muted-foreground">Exposure:</span>{" "}
                      <span className="font-mono">{exposureId}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Science Progam:
                      </span>{" "}
                      <span className="font-mono">{scienceProgram}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Obs. Reason:
                      </span>{" "}
                      <span className="font-mono">{obsReason}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Filter:</span>{" "}
                      <span className="font-mono">{physicalFilter}</span>
                    </div>
                  </div>
                );
              }}
              hideLabel
            />
          )}
        />
        {/* Data */}
        <Line {...lineProps} />
        {/* Selection rectangle shown during active highlighting */}
        {refAreaLeft && refAreaRight ? (
          <ReferenceArea x1={refAreaLeft} x2={refAreaRight} fillOpacity={0.3} />
        ) : null}
      </LineChart>
    </ChartContainer>
  );
}

function Plots() {
  // Routing and URL params
  const { startDayobs, endDayobs, telescope } = useSearch({ from: "/plots" });

  // The end dayobs is inclusive, so we add one day to the
  // endDayobs to get the correct range for the queries
  const queryEndDayobs = getDatetimeFromDayobsStr(endDayobs.toString())
    .plus({ days: 1 })
    .toFormat("yyyyMMdd");
  const instrument = TELESCOPES[telescope];

  // For display on page
  const instrumentName = telescope;
  const dateRangeString =
    startDayobs === endDayobs
      ? `on dayobs ${startDayobs}`
      : `in dayobs range ${startDayobs}–${endDayobs}`;

  // Data
  const [dataLogEntries, setDataLogEntries] = useState([]);
  const [availableDayobs, setAvailableDayobs] = useState([]);
  const [dataLogLoading, setDataLogLoading] = useState(true);

  // Twilights, moonrise/set and brightness
  const [twilightValues, setTwilightValues] = useState([]);
  const [illumValues, setIllumValues] = useState([]);
  const [moonValues, setMoonValues] = useState([]);
  const [moonIntervals, setMoonIntervals] = useState([]);
  const [almanacLoading, setAlmanacLoading] = useState(true);

  // Time ranges for timeline and plots
  const [selectedTimeRange, setSelectedTimeRange] = useState([null, null]);
  const [fullTimeRange, setFullTimeRange] = useState([null, null]);

  // Keep track of default and user-added plots
  const [activePlots, setActivePlots] = useState(
    PLOT_DEFINITIONS.filter((p) => p.default).map((p) => p.key),
  );

  // Plot format
  const [plotShape, setPlotShape] = useState("line");
  const [plotColor, setPlotColor] = useState("assorted");
  const [bandMarker, setBandMarker] = useState("none");

  async function prepareExposureData(dataLog) {
    // Prepare data for plots
    const data = dataLog
      .map((entry) => {
        const psfSigma = parseFloat(entry["psf sigma median"]);
        const pixelScale = !isNaN(entry.pixel_scale_median)
          ? entry.pixel_scale_median
          : 0.2; // TODO: get from utils
        const obsStartDt = isoToTAI(entry["obs start"]);
        return {
          ...entry,
          obs_start_dt: obsStartDt,
          obs_start_millis: obsStartDt.toMillis(),
          "psf median": !isNaN(psfSigma) ? psfSigma * 2.355 * pixelScale : null, // TODO: get from utils
        };
      })
      // Chronological order
      .sort((a, b) => a.obs_start_millis - b.obs_start_millis);

    // Get all available dayobs
    const dayobsRange = [
      ...new Set(data.map((entry) => entry["day obs"].toString())),
    ].sort();

    // Get first and last observations
    const firstObs = data.at(0)?.obs_start_dt ?? 0;
    const lastObs = data.at(-1)?.obs_start_dt ?? 0;

    // Set static timeline axis to boundaries of queried dayobs
    let fullXRange = [firstObs, lastObs];
    if (dayobsRange.length > 0) {
      const firstDayobs = dayobsRange[0];
      const lastDayobs = dayobsRange[dayobsRange.length - 1];

      const startTimeOfFirstDayobs = dayobsToTAI(firstDayobs, 12, 0);
      const endTimeOfLastDayobs = dayobsToTAI(lastDayobs, 11, 59);

      // Add an extra minute to the end so that the final dayobs tick line shows
      fullXRange = [
        startTimeOfFirstDayobs,
        endTimeOfLastDayobs.plus({ minute: 1 }),
      ];

      setAvailableDayobs(dayobsRange);
      setFullTimeRange(fullXRange);
      setSelectedTimeRange(fullXRange);
    }

    // Set the data to state
    setDataLogEntries(data);
  }

  async function prepareAlmanacData(almanac) {
    // Set values for twilight lines
    const twilightValues = almanac
      .map((dayobsAlm) => [
        utcDateTimeStrToTAIMillis(dayobsAlm.twilight_evening),
        utcDateTimeStrToTAIMillis(dayobsAlm.twilight_morning),
      ])
      .flat();

    // Set values for moon illumination at dayobs midnights
    const illumValues = almanac.flatMap((dayobsAlm) => [
      {
        dayobs: almanacDayobsForPlot(dayobsAlm.dayobs),
        illum: dayobsAlm.moon_illumination,
      },
    ]);

    // Set values for moon rise/set times
    const moonValues = almanac.flatMap((dayobsAlm) => [
      {
        time: utcDateTimeStrToTAIMillis(dayobsAlm.moon_rise_time),
        type: "rise",
      },
      {
        time: utcDateTimeStrToTAIMillis(dayobsAlm.moon_set_time),
        type: "set",
      },
    ]);

    setTwilightValues(twilightValues);
    setIllumValues(illumValues);
    setMoonValues(moonValues);
  }

  // Pair up moon rise/set times for display
  function prepareMoonIntervals(events, xMinMillis, xMaxMillis) {
    if (!events?.length) return [];

    const sorted = [...events].sort((a, b) => a.time - b.time);
    const intervals = [];
    let currentStart = null;
    for (let i = 0; i < sorted.length; i++) {
      const { time, type } = sorted[i];

      if (type === "rise") {
        // If this rise is before timeline, clamp it
        currentStart = Math.max(time, xMinMillis);
      } else if (type === "set" && currentStart != null) {
        // Clamp end time to max
        intervals.push([currentStart, Math.min(time, xMaxMillis)]);
        currentStart = null;
      }
    }

    // Handle moon already up at start
    if (sorted[0].type === "set") {
      intervals.unshift([xMinMillis, Math.min(sorted[0].time, xMaxMillis)]);
    }

    // Handle moon still up at end
    if (sorted[sorted.length - 1].type === "rise") {
      intervals.push([
        Math.max(sorted[sorted.length - 1].time, xMinMillis),
        xMaxMillis,
      ]);
    }

    return intervals;
  }

  useEffect(() => {
    if (telescope === "AuxTel") {
      return;
    }

    const abortController = new AbortController();

    // DEVELOPMENT ONLY ==============================
    // if (import.meta.env.DEV) {
    //   setDataLogLoading(true);
    //   setAlmanacLoading(true);

    //   setTimeout(() => {
    //     prepareExposureData(offlineResponse.data_log);
    //     prepareAlmanacData(offlineResponse.almanac_info);
    //     setDataLogLoading(false);
    //     setAlmanacLoading(false);
    //   }, 100);

    //   return () => {
    //     abortController.abort();
    //   };
    // }
    // ------------------------------------------------

    setDataLogLoading(true);
    setAlmanacLoading(true);

    fetchDataLogEntriesFromConsDB(
      startDayobs,
      queryEndDayobs,
      instrument,
      abortController,
    )
      .then((consDBData) => {
        const dataLog = consDBData.data_log ?? [];
        if (dataLog.length === 0) {
          toast.warning(
            "No data log records found in ConsDB for the selected date range.",
          );
        }
        prepareExposureData(dataLog);
      })
      .catch((err) => {
        if (!abortController.signal.aborted) {
          toast.error("Error fetching data log!", {
            description: err?.message || "Unknown error",
            duration: Infinity,
          });
        }
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setDataLogLoading(false);
        }
      });

    fetchAlmanac(startDayobs, queryEndDayobs, abortController)
      .then((almanac) => {
        prepareAlmanacData(almanac);
      })
      .catch((err) => {
        if (!abortController.signal.aborted) {
          toast.error("Error fetching almanac!", {
            description: err?.message,
            duration: Infinity,
          });
        }
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setAlmanacLoading(false);
        }
      });

    return () => {
      abortController.abort();
    };
  }, [startDayobs, queryEndDayobs, instrument]);

  // Pair up moon rise/set times
  useEffect(() => {
    const [xMinMillis, xMaxMillis] = fullTimeRange;
    if (moonValues && xMinMillis != null && xMaxMillis != null) {
      const intervals = prepareMoonIntervals(
        moonValues,
        xMinMillis,
        xMaxMillis,
      );
      setMoonIntervals(intervals);
    }
  }, [moonValues, fullTimeRange]);

  // Temporary display message for AuxTel queries
  if (telescope === "AuxTel") {
    return (
      <div className="flex flex-col w-full p-8 gap-4">
        <h1 className="flex flex-row gap-3 text-white text-5xl uppercase justify-center">
          <span className="tracking-[2px] font-extralight">
            {instrumentName}
          </span>
          <span className="font-extrabold">Plots</span>
        </h1>
        <p className="min-h-[4.5rem] text-white font-thin text-center pb-4 flex flex-col items-center justify-center gap-2">
          AuxTel is currently not supported in this page. Contact the Logging
          team if this is a priority for you.
        </p>
        <Toaster expand={true} richColors closeButton />
      </div>
    );
  }

  // TODO: When does this run?
  // Filter data based on selected time range
  const filteredData = dataLogEntries.filter(
    (entry) =>
      entry.obs_start_dt >= selectedTimeRange[0] &&
      entry.obs_start_dt <= selectedTimeRange[1],
  );

  return (
    <>
      <div className="flex flex-col w-full p-8 gap-4">
        {/* Page title */}
        <h1 className="flex flex-row gap-3 text-white text-5xl uppercase justify-center">
          <span className="tracking-[2px] font-extralight">
            {instrumentName}
          </span>
          <span className="font-extrabold">Plots</span>
        </h1>

        {/* Info section */}
        <div className="min-h-[4.5rem] text-white font-thin text-center pb-4 flex flex-col items-center justify-center gap-2">
          {dataLogLoading || almanacLoading ? (
            <>
              <Skeleton className="h-5 w-3/4 max-w-xl bg-stone-700" />
            </>
          ) : (
            <>
              <p>
                {dataLogEntries.length} exposures returned for {instrumentName}{" "}
                {dateRangeString}.
              </p>
            </>
          )}
          <div className="flex flex-col max-w-xxl mt-6 border border-1 border-white rounded-md p-2 gap-2">
            <p>
              <span className="font-medium">Click & Drag</span> on any plot to
              zoom in, and <span className="font-medium">Double-Click</span> to
              zoom out.
            </p>
            <p>
              Twilights are shown as blue lines, moon above the horizon is
              highlighted in yellow, and moon illumination (%) is displayed
              above the timeline at local Chilean midnight. All times displayed
              are in TAI (UTC+37s).
            </p>
            <p>
              Change which plots are shown by clicking the{" "}
              <span className="font-medium">Show/Hide Plots</span> button.
              Future features include remembering your plot preferences.
            </p>
          </div>
        </div>

        {/* Timeline */}
        {dataLogLoading || almanacLoading ? (
          <Skeleton className="w-full h-20 bg-stone-700 rounded-md" />
        ) : (
          <>
            <Timeline
              data={dataLogEntries}
              twilightValues={twilightValues}
              illumValues={illumValues}
              moonIntervals={moonIntervals}
              fullTimeRange={fullTimeRange}
              selectedTimeRange={selectedTimeRange}
              setSelectedTimeRange={setSelectedTimeRange}
              staticTicks={true}
            />
          </>
        )}

        {/* Time Window Inputs & Controls */}
        {dataLogLoading || almanacLoading ? (
          <Skeleton className="w-full h-20 bg-stone-700 rounded-md" />
        ) : (
          <div className="flex flex-row w-full justify-between items-center gap-8 mt-4">
            <PlotVisibilityPopover
              dataLogEntries={dataLogEntries}
              activePlots={activePlots}
              setActivePlots={setActivePlots}
            />
            {/* Conditionally display band icon/color key */}
            {bandMarker !== "none" && (
              <div className="flex flex-row h-10 px-4 justify-between items-center gap-3 border border-1 border-white rounded-md text-white font-thin">
                <div>Bands:</div>

                {Object.entries(BAND_COLORS).map(([band, color]) => {
                  // Map each band to its shape component
                  const ShapeComponent = {
                    u: "circle",
                    g: TriangleShape,
                    r: FlippedTriangleShape,
                    i: SquareShape,
                    z: StarShape,
                    y: AsteriskShape,
                  }[band];

                  return (
                    <div key={band} className="flex items-center gap-1">
                      <svg width="16" height="16">
                        <ShapeComponent cx={8} cy={8} fill={color} r={4} />
                      </svg>
                      <span>{band}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Plot format controls */}
            <PlotFormatPopover
              plotShape={plotShape}
              setPlotShape={setPlotShape}
              plotColor={plotColor}
              setPlotColor={setPlotColor}
              bandMarker={bandMarker}
              setBandMarker={setBandMarker}
            />
          </div>
        )}

        {/* Plots */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {dataLogLoading || almanacLoading ? (
            <>
              {/* 4 loading plot skeletons */}
              {Array(4)
                .fill(true)
                .map((_, i) => (
                  <Skeleton
                    key={i}
                    className="w-full h-80 bg-stone-700 rounded-md"
                  />
                ))}
            </>
          ) : (
            <>
              {activePlots.map((key, idx) => {
                const def = PLOT_DEFINITIONS.find((p) => p.key === key);
                return (
                  <TimeseriesPlot
                    title={def?.title || prettyTitleFromKey(key)}
                    unit={def?.unit}
                    dataKey={def.key}
                    key={def.key}
                    data={filteredData}
                    twilightValues={twilightValues}
                    // Show moon rise/set only on sky-related plots
                    {...(def.key.startsWith("sky")
                      ? { moonIntervals: moonIntervals }
                      : {})}
                    fullTimeRange={fullTimeRange}
                    selectedTimeRange={selectedTimeRange}
                    setSelectedTimeRange={setSelectedTimeRange}
                    plotShape={plotShape}
                    plotColor={plotColor}
                    bandMarker={bandMarker}
                    isBandPlot={!!def?.bandMarker}
                    plotIndex={idx}
                  />
                );
              })}
            </>
          )}
        </div>

        {/* Visit Maps */}
        <div className="mt-16 mxb-8 text-white font-thin text-center">
          <h1 className="flex flex-row gap-2 text-white text-3xl uppercase justify-center pb-4">
            <span className="tracking-[2px] font-extralight">Visit</span>
            <span className="font-extrabold"> Maps</span>
          </h1>
          {dataLogLoading || almanacLoading ? (
            <Skeleton className="w-full h-20 bg-stone-700 rounded-md" />
          ) : (
            <>
              <p>
                For visit maps, visit the Scheduler-oriented night summaries:{" "}
                {availableDayobs.map((dayobs, idx) => {
                  // TODO: Create timeUtils
                  const dt = DateTime.fromFormat(dayobs, "yyyyLLdd");
                  const pathFormat = dt.toFormat("yyyy/LL/dd");
                  const fileFormat = dt.toFormat("yyyy-LL-dd");
                  // TODO: How should we generate url?
                  return (
                    <span key={dayobs}>
                      <a
                        href={`https://s3df.slac.stanford.edu/data/rubin/sim-data/schedview/reports/nightsum/lsstcam/${pathFormat}/nightsum_${fileFormat}.html`}
                        className="underline text-blue-300 hover:text-blue-400"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {fileFormat}
                      </a>
                      {idx < availableDayobs.length - 1 && ", "}
                    </span>
                  );
                })}
                .
              </p>
              <p className="pt-2">
                <span className="font-medium">Note: </span>If you see a 404
                error, the summary might not have been created for that day.
              </p>
            </>
          )}
        </div>
      </div>
      <Toaster expand={true} richColors closeButton />
    </>
  );
}

export default Plots;
