import { useState, useEffect } from "react";
import { DateTime } from "luxon";

import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { useSearch } from "@tanstack/react-router";

import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

import { TELESCOPES } from "@/components/parameters";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  CartesianGrid,
  Line,
  LineChart,
  // Cell,
  XAxis,
  YAxis,
  // Customized,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from "recharts";

import { fetchDataLogEntriesFromConsDB } from "@/utils/fetchUtils";
import { getDatetimeFromDayobsStr } from "@/utils/utils";

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

function TimelineChart({ data, selectedTimeRange, setSelectedTimeRange }) {
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

  // Hourly lines and ticks
  const dataMin = Math.min(...data.map((d) => d.obs_start_dt));
  const dataMax = Math.max(...data.map((d) => d.obs_start_dt));
  // const generateHourlyTicks = (start, end, intervalHours = 1) => {
  //   const ticks = [];
  //   let t = DateTime.fromMillis(start).startOf("hour");
  //   const endDt = DateTime.fromMillis(end);
  //   while (t <= endDt) {
  //     ticks.push(t.toMillis());
  //     t = t.plus({ hours: intervalHours });
  //   }
  //   return ticks;
  // };
  const generateHourlyTicks = (start, end, intervalHours = 1) => {
    const ticks = [];
    let t = DateTime.fromMillis(start).startOf("hour");
    const endDt = DateTime.fromMillis(end).endOf("hour"); // extend to include end hour
    while (t <= endDt) {
      ticks.push(t.toMillis());
      t = t.plus({ hours: intervalHours });
    }
    return ticks;
  };

  const hourlyTicks = generateHourlyTicks(dataMin, dataMax, 1);

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
          type="number"
          domain={["dataMin", "dataMax"]}
          scale="time"
          ticks={hourlyTicks}
          interval="preserveStartEnd"
          tickFormatter={(tick) => DateTime.fromMillis(tick).toFormat("HH:mm")}
          tick={{ fill: "white", style: { userSelect: "none" } }}
          axisLine={false}
          tickMargin={10}
          minTickGap={15}
        />
        <YAxis hide domain={[0, 1]} />
        <Line
          dataKey={() => 0.5}
          stroke="#FFFFFF"
          type="linear"
          dot={<CustomizedDot stroke="#3CAE3F" />}
          isAnimationActive={false}
        />
        {refAreaLeft && refAreaRight ? (
          <ReferenceArea
            x1={refAreaLeft}
            x2={refAreaRight}
            strokeOpacity={0.3}
          />
        ) : null}
        {selectedTimeRange[0] && selectedTimeRange[1] ? (
          <ReferenceArea
            x1={selectedTimeRange[0]}
            x2={selectedTimeRange[1]}
            stroke="pink"
            // stroke="#0C4A47"
            strokeOpacity={1}
            // fill="#0C4A47"
            fillOpacity={0.3}
          />
        ) : null}
      </LineChart>
    </ResponsiveContainer>
  );
}

function ObservingDataChart({ title, dataKey, data, preferredYDomain = null }) {
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
    <ChartContainer title={title} config={{}}>
      <LineChart
        width={500}
        height={300}
        data={data}
        margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#555" />
        <XAxis
          dataKey="obs_start_dt"
          type="number"
          domain={["auto", "auto"]}
          scale="time"
          tickFormatter={(tick) => DateTime.fromMillis(tick).toFormat("HH:mm")}
          tick={{ fill: "white" }}
          label={{
            value: "Observation Start Time (TAI)",
            position: "bottom",
            fill: "white",
            dy: 25,
          }}
        />
        <YAxis
          tick={{ fill: "white" }}
          domain={finalYDomain}
          label={{
            value: title,
            angle: -90,
            position: "insideLeft",
            fill: "white",
            dx: -10,
          }}
        />
        <ChartTooltip
          content={(props) => (
            <ChartTooltipContent
              {...props}
              formatter={(value, name, item, index, payload) => {
                const obsStart = payload["obs start"];
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
                        obs_start (TAI):
                      </span>{" "}
                      <span className="font-mono">{obsStart}</span>
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
          // stroke=""
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

  // Time window state
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

    // Cleanup function
    return () => {
      abortController.abort();
    };
  }, [startDayobs, queryEndDayobs, instrument]);

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
    .map((entry) => ({
      ...entry,
      // Convert observation start time to a number for Recharts
      obs_start_dt: DateTime.fromISO(entry["obs start"]).toMillis(),
    }))
    // Chronological order
    .sort((a, b) => a.obs_start_dt - b.obs_start_dt);

  // Timeline start and end
  const timelineStart = chartData.at(0)?.obs_start_dt ?? 0;
  const timelineEnd = chartData.at(-1)?.obs_start_dt ?? 0;

  // If no selection, use full range
  const [rangeStart, rangeEnd] =
    selectedTimeRange[0] && selectedTimeRange[1]
      ? selectedTimeRange
      : [timelineStart, timelineEnd];

  // Filter chart data based on selected time range
  const filteredChartData = chartData.filter(
    (entry) =>
      entry.obs_start_dt >= rangeStart && entry.obs_start_dt <= rangeEnd,
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
          {dataLogLoading ? (
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
        <TimelineChart
          data={chartData}
          selectedTimeRange={selectedTimeRange}
          setSelectedTimeRange={setSelectedTimeRange}
        />

        {/* Time Window Inputs */}
        <div className="flex gap-24 justify-center text-white">
          <Label className="flex flex-col gap-4">
            <Input
              type="time" // this is browser dependent and behaves differently in different browsers
              id="start-time-picker"
              step="60"
              lang="en-GB"
              inputMode="numeric"
              pattern="[0-9]{2}:[0-9]{2}"
              className="max-w-[100px] bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
              value={DateTime.fromMillis(rangeStart).toFormat("HH:mm")}
              onChange={(e) => {
                const [h, m] = e.target.value.split(":").map(Number);
                const newStart = DateTime.fromMillis(rangeStart)
                  .set({ hour: h, minute: m })
                  .toMillis();
                setSelectedTimeRange([newStart, rangeEnd]);
              }}
            />
            Start Time (TAI)
          </Label>
          <Label className="flex flex-col gap-4">
            <Input
              type="time"
              id="end-time-picker"
              step="60"
              lang="en-GB"
              inputMode="numeric"
              pattern="[0-9]{2}:[0-9]{2}"
              className="max-w-[100px] bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
              value={DateTime.fromMillis(rangeEnd).toFormat("HH:mm")}
              onChange={(e) => {
                const [h, m] = e.target.value.split(":").map(Number);
                const newEnd = DateTime.fromMillis(rangeEnd)
                  .set({ hour: h, minute: m })
                  .toMillis();
                setSelectedTimeRange([rangeStart, newEnd]);
              }}
            />
            End Time (TAI)
          </Label>
        </div>

        {/* Plots */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <ObservingDataChart
            title="DIMM Seeing"
            dataKey="dimm seeing"
            data={filteredChartData}
            preferredYDomain={[0.6, 1.8]}
          />
          <ObservingDataChart
            title="Photometric Zero Points"
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
        </div>
      </div>
      <Toaster expand={true} richColors closeButton />
    </>
  );
}

export default Plots;
