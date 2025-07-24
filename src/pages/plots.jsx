import { useState, useEffect } from "react";
import { DateTime } from "luxon";

import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { useSearch } from "@tanstack/react-router";

import { Skeleton } from "@/components/ui/skeleton";
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
  // ResponsiveContainer,
} from "recharts";

import { fetchDataLogEntriesFromConsDB } from "@/utils/fetchUtils";
import { getDatetimeFromDayobsStr } from "@/utils/utils";

function MetricLineChart({ title, dataKey, data, preferredYDomain = null }) {
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
            value: "Time (TAI)",
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
        // console.log(dataLog);

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

        {/* Plots */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <MetricLineChart
            title="DIMM Seeing"
            dataKey="dimm seeing"
            data={chartData}
            preferredYDomain={[0.6, 1.8]}
          />
          <MetricLineChart
            title="Photometric Zero Points"
            dataKey="zero point median"
            data={chartData}
            preferredYDomain={[30, 36]}
          />
          <MetricLineChart title="Airmass" dataKey="airmass" data={chartData} />
          <MetricLineChart
            title="Sky Brightness"
            dataKey="sky bg median"
            data={chartData}
          />
        </div>
      </div>
      <Toaster expand={true} richColors closeButton />
    </>
  );
}

export default Plots;
