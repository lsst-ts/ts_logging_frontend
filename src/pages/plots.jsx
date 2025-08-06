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

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { TELESCOPES } from "@/components/parameters";

import {
  fetchAlmanac,
  fetchDataLogEntriesFromConsDB,
} from "@/utils/fetchUtils";
import { getDatetimeFromDayobsStr } from "@/utils/utils";

import TimeWindowControls from "@/components/TimeWindowControls";

// import offlineResponse from "@/assets/dataLog_Simonyi_20250722_20250723.json";

// Small vertical lines to represent exposures in the timeline
const CustomizedDot = (props) => {
  const { cx, cy, stroke } = props;

  if (cx == null || cy == null) return null;

  return (
    // vertically centre the lines
    <svg x={cx - 0.5} y={cy - 10} width={1} height={20}>
      <rect x={0} y={0} width={1} height={20} fill={stroke || "#3CAE3F"} />
    </svg>
  );
};

function TimelineChart({
  data,
  selectedTimeRange,
  setSelectedTimeRange,
  almanacInfo,
}) {
  const [refAreaLeft, setRefAreaLeft] = useState(null);
  const [refAreaRight, setRefAreaRight] = useState(null);

  const handleMouseDown = (e) => setRefAreaLeft(e?.activeLabel ?? null);
  const handleMouseMove = (e) =>
    refAreaLeft && setRefAreaRight(e?.activeLabel ?? null);
  const handleMouseUp = () => {
    if (!refAreaLeft || !refAreaRight || refAreaLeft === refAreaRight) {
      setRefAreaLeft(null);
      setRefAreaRight(null);
      return;
    }
    const [start, end] =
      refAreaLeft < refAreaRight
        ? [refAreaLeft, refAreaRight]
        : [refAreaRight, refAreaLeft];
    setSelectedTimeRange([start, end]);
    setRefAreaLeft(null);
    setRefAreaRight(null);
  };

  // Set values for twilight lines
  const twilightValues = almanacInfo
    .map((dayobsAlm) => {
      const eve = DateTime.fromFormat(
        dayobsAlm.twilight_evening,
        "yyyy-MM-dd HH:mm:ss",
      ).toMillis(); // TODO: is this definitely TAI?
      const mor = DateTime.fromFormat(
        dayobsAlm.twilight_morning,
        "yyyy-MM-dd HH:mm:ss",
      ).toMillis();
      return [eve, mor];
    })
    .flat();

  // Set min/max values for x-axis
  const xVals = data
    .map((d) => d.obs_start_dt)
    .filter((v) => typeof v === "number" && !isNaN(v));
  const allXVals = [...xVals, ...twilightValues];
  const xMin = Math.min(...allXVals);
  const xMax = Math.max(...allXVals);

  const generateHourlyTicks = (start, end, intervalHours = 1) => {
    const ticks = [];
    let t = DateTime.fromMillis(start).startOf("hour");
    const endDt = DateTime.fromMillis(end).endOf("hour");
    while (t <= endDt) {
      ticks.push(t.toMillis());
      t = t.plus({ hours: intervalHours });
    }
    return ticks;
  };
  const hourlyTicks = generateHourlyTicks(xMin, xMax, 1);

  return (
    <ResponsiveContainer
      title="Time Window Selector"
      config={{}}
      width="100%"
      height={80}
    >
      <LineChart
        width="100%"
        height={80}
        data={data}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* Vertical lines on the hour */}
        {hourlyTicks.map((tick) => (
          <ReferenceLine
            key={tick}
            x={tick}
            stroke="#555"
            strokeDasharray="3 3"
          />
        ))}
        <XAxis
          dataKey="obs_start_dt"
          domain={[xMin, xMax]}
          allowDataOverflow={true}
          type="number"
          scale="time"
          tickFormatter={(tick) => DateTime.fromMillis(tick).toFormat("HH:mm")}
          ticks={hourlyTicks}
          interval="preserveStartEnd"
          tick={{ fill: "white", style: { userSelect: "none" } }}
          axisLine={false}
          tickMargin={10}
          minTickGap={15}
        />
        <YAxis hide domain={[0, 1]} />
        {/* Twilight lines */}
        {twilightValues.map((twi, i) =>
          typeof twi === "number" &&
          !isNaN(twi) &&
          xMin <= twi &&
          twi <= xMax ? (
            <ReferenceLine
              key={`twilight-${i}-${twi}`}
              x={twi}
              stroke="#0ea5e9" // sky-500
              strokeWidth={3}
              strokeDasharray="4 4"
              yAxisId="0"
            />
          ) : null,
        )}
        {/* Points representing exposures and related data */}
        <Line
          dataKey={() => 0.5}
          stroke="#FFFFFF"
          type="linear"
          dot={<CustomizedDot stroke="#3CAE3F" />}
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
        {/* Selection rectangle shown once time window selection made */}
        {selectedTimeRange[0] && selectedTimeRange[1] ? (
          <ReferenceArea
            x1={selectedTimeRange[0]}
            x2={selectedTimeRange[1]}
            stroke="pink"
            fillOpacity={0.3}
          />
        ) : null}
      </LineChart>
    </ResponsiveContainer>
  );
}

function ObservingDataChart({
  title,
  unit = null,
  dataKey,
  data,
  preferredYDomain = null,
}) {
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

  return (
    <ChartContainer className="pt-8" title={title} config={{}}>
      <h1 className="text-white text-lg font-thin text-center">{title}</h1>
      <LineChart
        width={500}
        height={300}
        data={data}
        margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#555" />
        <XAxis
          dataKey="obs_start_dt"
          type="number"
          domain={["auto", "auto"]}
          scale="time"
          tickFormatter={(tick) => DateTime.fromMillis(tick).toFormat("HH:mm")}
          tick={{ fill: "white" }}
        />
        <YAxis
          tick={{ fill: "white" }}
          domain={finalYDomain}
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
        <ChartTooltip
          content={(props) => (
            <ChartTooltipContent
              {...props}
              formatter={(value, name, item, index, payload) => {
                const obsStart = payload["obs start"];
                const obsStartFormatted = DateTime.fromISO(obsStart).toFormat(
                  "yyyyLLdd HH:mm:ss.SSS",
                );
                const exposureId = payload["exposure id"];
                const band = payload["band"];

                const formattedValue =
                  typeof value === "number" && !Number.isInteger(value)
                    ? value.toFixed(4)
                    : value;

                return (
                  <div className="flex flex-col gap-1">
                    <div>
                      <span className="text-muted-foreground">Exposure:</span>{" "}
                      <span className="font-mono">{exposureId}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{title}:</span>{" "}
                      <span className="font-mono">{formattedValue}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Band:</span>{" "}
                      <span className="font-mono">{band}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Obs Start (TAI):
                      </span>{" "}
                      <span className="font-mono">{obsStartFormatted}</span>
                    </div>
                  </div>
                );
              }}
              hideLabel
            />
          )}
        />
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke="#000000"
          strokeWidth={2}
          // dot={{ r: 1, fill: "#0C4A47", stroke: "#0C4A47" }} // sidebar teal
          dot={{ r: 0.5, fill: "#3CAE3F", stroke: "#3CAE3F" }} // shadow green
          activeDot={{ r: 4, fill: "#ffffff" }}
        />
      </LineChart>
    </ChartContainer>
  );
}

function Plots() {
  // Routing and URL params
  const { startDayobs, endDayobs, telescope } = useSearch({ from: "/plots" });

  const [selectedTimeRange, setSelectedTimeRange] = useState([null, null]);

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
  const [dataLogLoading, setDataLogLoading] = useState(true);

  // Twilights, moonrise/set and brightness
  const [almanacInfo, setAlmanacInfo] = useState([]);
  const [almanacLoading, setAlmanacLoading] = useState(true);

  useEffect(() => {
    if (telescope === "AuxTel") {
      return;
    }

    // To cancel previous fetch if still in progress
    const abortController = new AbortController();

    // Trigger loading skeletons
    setDataLogLoading(true);

    // Fetch data from both sources
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

        // Set the merged data to state
        setDataLogEntries(dataLog);
        setDataLogLoading(false);
      })
      .catch((err) => {
        if (!abortController.signal.aborted) {
          const msg = err?.message || "Unknown error";
          toast.error("Error fetching data log!", {
            description: msg,
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
        setAlmanacInfo(almanac);
        console.log(almanac); // TODO: Remove before PR
      })
      .catch((err) => {
        if (!abortController.signal.aborted) {
          const msg = err?.message;
          toast.error("Error fetching almanac!", {
            description: msg,
            duration: Infinity,
          });
        }
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setAlmanacLoading(false);
        }
      });

    // Cleanup function
    return () => {
      abortController.abort();
    };
  }, [startDayobs, queryEndDayobs, instrument]);

  // Temporary offline data for Simonyi
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

  // Prepare data for charts
  const chartData = dataLogEntries
    .map((entry) => {
      const psfSigma = parseFloat(entry["psf sigma median"]); // TODO: get from utils after PR
      const pixelScale = !isNaN(entry.pixel_scale_median)
        ? entry.pixel_scale_median
        : 0.2;
      return {
        ...entry,
        // Convert observation start time to a number for Recharts
        obs_start_dt: DateTime.fromISO(entry["obs start"]).toMillis(),
        "psf median": !isNaN(psfSigma) ? psfSigma * 2.355 * pixelScale : null,
      };
    })
    // Chronological order
    .sort((a, b) => a.obs_start_dt - b.obs_start_dt);

  // Get all available dayobs
  const availableDayobs = [
    ...new Set(chartData.map((entry) => entry["day obs"].toString())),
  ].sort();

  // Timeline start and end
  const timelineStart = chartData.at(0)?.obs_start_dt ?? 0;
  const timelineEnd = chartData.at(-1)?.obs_start_dt ?? 0;

  // If no selection, use full range
  const [windowStart, windowEnd] =
    selectedTimeRange[0] && selectedTimeRange[1]
      ? selectedTimeRange
      : [timelineStart, timelineEnd];

  // Filter chart data based on selected time range
  const filteredChartData = chartData.filter(
    (entry) =>
      entry.obs_start_dt >= windowStart && entry.obs_start_dt <= windowEnd,
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
          <TimelineChart
            data={chartData}
            selectedTimeRange={selectedTimeRange}
            setSelectedTimeRange={setSelectedTimeRange}
            almanacInfo={almanacInfo}
          />
        )}

        {/* Time Window Inputs & Controls */}
        {dataLogLoading || almanacLoading ? (
          <Skeleton className="w-full h-20 bg-stone-700 rounded-md" />
        ) : (
          <TimeWindowControls
            windowStart={windowStart}
            windowEnd={windowEnd}
            selectedTimeRange={selectedTimeRange}
            setSelectedTimeRange={setSelectedTimeRange}
            availableDayobs={availableDayobs}
            timelineStart={timelineStart}
            timelineEnd={timelineEnd}
          />
        )}

        {/* Plots */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {dataLogLoading || almanacLoading ? (
            <>
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
              <ObservingDataChart
                title="Seeing (PSF)"
                unit="arcsec"
                dataKey="psf median"
                data={filteredChartData}
                preferredYDomain={[0.6, 1.8]}
              />
              <ObservingDataChart
                title="Photometric Zero Points"
                unit="magnitude"
                dataKey="zero point median"
                data={filteredChartData}
                preferredYDomain={[30, 36]}
              />
              <ObservingDataChart
                title="Airmass"
                dataKey="airmass"
                data={filteredChartData}
              />
              <ObservingDataChart
                title="Sky Brightness"
                dataKey="sky bg median"
                data={filteredChartData}
              />
            </>
          )}
        </div>
      </div>
      <Toaster expand={true} richColors closeButton />
    </>
  );
}

export default Plots;
