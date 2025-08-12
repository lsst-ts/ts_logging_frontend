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

import ResetTimeRangeButton from "@/components/ResetTimeRangeButton";
import PlotVisibilityPopover from "@/components/PlotVisibilityPopover";
import { PLOT_DEFINITIONS } from "@/components/PLOT_DEFINITIONS";
import { TELESCOPES } from "@/components/parameters";

import {
  fetchAlmanac,
  fetchDataLogEntriesFromConsDB,
} from "@/utils/fetchUtils";
import { getDatetimeFromDayobsStr } from "@/utils/utils";
import {
  isoToTAI,
  dayobsToTAI,
  millisToDateTime,
  millisToHHmm,
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

function Timeline({
  data,
  twilightValues = [],
  moonValues = [],
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
  // Dayobs xAxis
  // Alternate dayobs labels and vertical lines
  const renderDayobsTicks = ({ x, y, payload }) => {
    const value = payload.value;
    const dt = millisToDateTime(value);

    const hour = dt.hour;
    const isMidday = hour === 12;
    const isMidnight = hour === 0;

    // Lines at midday
    if (isMidday) {
      return <line x1={x} y1={y - 100} x2={x} y2={y + 22} stroke="grey" />;
    }

    // Labels at midnight
    if (isMidnight) {
      // Get date prior to midnight
      const dayobs = dt.minus({ minutes: 1 }).toFormat("yyyyLLdd");
      return (
        <text
          x={x}
          y={y + 22}
          fontSize={14}
          textAnchor="middle"
          fill="grey"
          style={{ WebkitUserSelect: "none" }}
        >
          {dayobs}
        </text>
      );
    }

    return null;
  };
  // --------------------------------------------------------

  // Timeline ===============================================
  return (
    <ResponsiveContainer
      title="Time Window Selector"
      config={{}}
      width="100%"
      height={twilightValues.length > 1 ? 120 : 80}
    >
      <LineChart
        width="100%"
        height={twilightValues.length > 1 ? 120 : 80}
        data={data}
        margin={{ top: 0, right: 30, left: 30, bottom: 0 }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      >
        {/* Timeline */}
        <ReferenceLine y={0.5} stroke="white" strokeWidth={1.5} />
        {/* Vertical lines on the hour */}
        {hourlyTicks.map((tick) => (
          <ReferenceLine
            key={tick}
            x={tick}
            stroke="white"
            // strokeDasharray="3 3"
            opacity={0.2}
          />
        ))}
        {/* Dayobs axis - labels and lines */}
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
            height={40}
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
          tickFormatter={(tick) => millisToHHmm(tick)}
          ticks={staticTicks && hourlyTicks}
          interval={staticTicks ?? "preserveStartEnd"}
          tick={{ fill: "white", style: { userSelect: "none" } }}
          axisLine={false}
          tickMargin={10}
          minTickGap={15}
        />
        <YAxis hide domain={[0, 1]} />
        {/* Selection rectangle shown once time window selection made */}
        {selectedMinMillis && selectedMaxMillis ? (
          <ReferenceArea
            x1={selectedMinMillis}
            x2={selectedMaxMillis}
            stroke="hotPink"
            fillOpacity={0.2}
          />
        ) : null}
        {/* Twilight lines */}
        {twilightValues.map((twi, i) =>
          xMinMillis <= twi && twi <= xMaxMillis ? (
            <ReferenceLine
              key={`twilight-${i}-${twi}`}
              x={twi}
              stroke="#0ea5e9"
              strokeWidth={3}
              yAxisId="0"
            />
          ) : null,
        )}
        {/* Moon lines */}
        {moonValues.map((twi, i) =>
          xMinMillis <= twi && twi <= xMaxMillis ? (
            <ReferenceLine
              key={`moon-${i}-${twi}`}
              x={twi}
              stroke="#EAB308"
              strokeWidth={3}
              yAxisId="0"
            />
          ) : null,
        )}
        {/* Points representing exposures and related data */}
        <Line
          dataKey={() => 0.5}
          stroke="#FFFFFF"
          type="linear"
          dot={<CustomisedDot stroke="#3CAE3F" h="20" w="1" />}
          isAnimationActive={false}
        />
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
  twilightValues = [],
  moonValues = [],
  fullTimeRange,
  selectedTimeRange,
  setSelectedTimeRange,
}) {
  const [refAreaLeft, setRefAreaLeft] = useState(null);
  const [refAreaRight, setRefAreaRight] = useState(null);
  const selectedMinMillis = selectedTimeRange[0]?.toMillis();
  const selectedMaxMillis = selectedTimeRange[1]?.toMillis();

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
          width={50}
          label={{
            value: unit,
            angle: -90,
            position: "insideLeft",
            fill: "white",
            dx: 0,
            dy: 20,
            fontSize: 16,
            fontWeight: 100,
            letterSpacing: 1,
          }}
        />
        {/* Selection rectangle shown once time window selection made */}
        {selectedMinMillis && selectedMaxMillis ? (
          <ReferenceArea
            x1={selectedMinMillis}
            x2={selectedMaxMillis}
            fillOpacity={0}
          />
        ) : null}
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
        {/* Moon lines */}
        {moonValues.map((twi, i) =>
          selectedMinMillis <= twi && twi <= selectedMaxMillis ? (
            <ReferenceLine
              key={`moon-${i}-${twi}`}
              x={twi}
              stroke="#EAB308"
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
                const band = payload["band"];
                const scienceProgram = payload["science program"];
                const obsReason = payload["observation reason"];

                const formattedValue =
                  typeof value === "number" && !Number.isInteger(value)
                    ? value.toFixed(4)
                    : value;

                return (
                  <div className="flex flex-col gap-1">
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
                      <span className="text-muted-foreground">Band:</span>{" "}
                      <span className="font-mono">{band}</span>
                    </div>
                  </div>
                );
              }}
              hideLabel
            />
          )}
        />
        {/* Data */}
        <Line
          connectNulls
          type="monotone"
          dataKey={dataKey}
          // stroke="#000000" // black
          stroke="#3CAE3F" // green
          strokeWidth={2}
          // points
          // dot={{ r: 1, fill: "#0C4A47", stroke: "#0C4A47" }} // sidebar teal circle
          // dot={{ r: 0.5, fill: "#3CAE3F", stroke: "#3CAE3F" }} // shadow green circle
          // dot={<CustomisedDot stroke="#3CAE3F" h="5" w="0.5" />} // green vertical lines
          dot={<CustomisedDot stroke="#3CAE3F" h="0" w="0.5" />} // no points
          activeDot={{ r: 4, fill: "#ffffff" }}
        />
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
  const [moonValues, setMoonValues] = useState([]);
  const [almanacLoading, setAlmanacLoading] = useState(true);

  // Time ranges for timeline and plots
  const [selectedTimeRange, setSelectedTimeRange] = useState([null, null]);
  const [fullTimeRange, setFullTimeRange] = useState([null, null]);

  // Keep track of default and user-added plots
  const [activePlots, setActivePlots] = useState(
    PLOT_DEFINITIONS.filter((p) => p.default).map((p) => p.key),
  );

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

    // Timeline start and end
    const timelineStart = data.at(0)?.obs_start_dt ?? 0;
    const timelineEnd = data.at(-1)?.obs_start_dt ?? 0;

    // Get all available dayobs
    const dayobsRange = [
      ...new Set(data.map((entry) => entry["day obs"].toString())),
    ].sort();

    // Set static timeline axis to boundaries of queried dayobs
    let fullXRange = [timelineStart, timelineEnd];
    if (dayobsRange.length > 0) {
      const firstDayobs = dayobsRange[0];
      const lastDayobs = dayobsRange[dayobsRange.length - 1];

      const startTimeOfFirstDayobs = dayobsToTAI(firstDayobs, 12, 0);
      const endTimeOfLastDayobs = dayobsToTAI(lastDayobs, 11, 59);

      fullXRange = [startTimeOfFirstDayobs, endTimeOfLastDayobs];

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
      .map((dayobsAlm) => {
        const eve = DateTime.fromFormat(
          dayobsAlm.twilight_evening,
          "yyyy-MM-dd HH:mm:ss",
          { zone: "utc" },
        )
          .plus({ seconds: 37 }) // TODO: get TAI constant from utils
          .toMillis();
        const mor = DateTime.fromFormat(
          dayobsAlm.twilight_morning,
          "yyyy-MM-dd HH:mm:ss",
          { zone: "utc" },
        )
          .plus({ seconds: 37 }) // TODO: get TAI constant from utils
          .toMillis();
        return [eve, mor];
      })
      .flat();

    // Set values for moon rise/set lines
    const moonValues = almanac
      .map((dayobsAlm) => {
        const moonRise = DateTime.fromFormat(
          dayobsAlm.moon_rise_time,
          "yyyy-MM-dd HH:mm:ss",
        )
          .plus({ seconds: 37 }) // TODO: get TAI constant from utils
          .toMillis();
        const moonSet = DateTime.fromFormat(
          dayobsAlm.moon_set_time,
          "yyyy-MM-dd HH:mm:ss",
        )
          .plus({ seconds: 37 }) // TODO: get TAI constant from utils
          .toMillis();
        return [moonRise, moonSet];
      })
      .flat();

    // TODO: this should be [moonRise, moonSet]
    setTwilightValues(twilightValues);
    setMoonValues(moonValues);
    console.log(almanac); // TODO: Remove before PR
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

  // // Temporary offline data for Simonyi
  // useEffect(() => {
  //   setDataLogEntries(offlineResponse.data_log || []);
  //   setDataLogLoading(false);
  // }, []);

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
          AuxTel is currently not supported in this page.
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
        </div>

        {/* Timeline */}
        {dataLogLoading || almanacLoading ? (
          <Skeleton className="w-full h-20 bg-stone-700 rounded-md" />
        ) : (
          <>
            <Timeline
              data={dataLogEntries}
              twilightValues={twilightValues}
              moonValues={moonValues}
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
          <div className="flex flex-row w-full justify-between gap-8">
            <PlotVisibilityPopover
              dataLogEntries={dataLogEntries}
              activePlots={activePlots}
              setActivePlots={setActivePlots}
            />
            <ResetTimeRangeButton
              fullTimeRange={fullTimeRange}
              selectedTimeRange={selectedTimeRange}
              setSelectedTimeRange={setSelectedTimeRange}
              availableDayobs={availableDayobs}
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
              {activePlots.map((key) => {
                const def = PLOT_DEFINITIONS.find((p) => p.key === key);
                return (
                  <TimeseriesPlot
                    title={def?.title || prettyTitleFromKey(key)}
                    dataKey={def.key}
                    key={def.key}
                    data={filteredData}
                    twilightValues={twilightValues}
                    // Show moon rise/set only on sky-related plots
                    {...(def.key.startsWith("sky")
                      ? { moonValues: moonValues }
                      : {})}
                    fullTimeRange={fullTimeRange}
                    selectedTimeRange={selectedTimeRange}
                    setSelectedTimeRange={setSelectedTimeRange}
                  />
                );
              })}
            </>
          )}
        </div>
      </div>
      <Toaster expand={true} richColors closeButton />
    </>
  );
}

export default Plots;
