import React, { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import DownloadIcon from "../assets/DownloadIcon.svg";
import InfoIcon from "../assets/InfoIcon.svg";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { Cell, Bar, BarChart, XAxis, YAxis } from "recharts";
import { DateTime } from "luxon";

function TimeAccountingApplet({
  exposuresLoading,
  almanacLoading,
  sumExpTime,
  nightHours,
  exposureFields,
  weatherLoss,
  faultLoss,
}) {
  const expPercent = Math.round((sumExpTime / (nightHours * 3600)) * 100);
  const nonExpPercent = 100 - expPercent;

  const data = useMemo(
    () =>
      // fallback to empty array if exposureFields is undefined
      (exposureFields ?? []).map((entry) => {
        // Convert obs_start and obs_end to DateTime objects
        const obsStart = entry["obs_start"];
        const obsEnd = entry["obs_end"];
        let obs_start_dt = undefined;
        let obs_end_dt = undefined;
        if (
          typeof obsStart === "string" &&
          DateTime.fromISO(obsStart).isValid
        ) {
          obs_start_dt = DateTime.fromISO(obsStart);
        }

        if (typeof obsEnd === "string" && DateTime.fromISO(obsEnd).isValid) {
          obs_end_dt = DateTime.fromISO(obsEnd);
        }
        return { ...entry, obs_start_dt, obs_end_dt };
      }),
    [exposureFields],
  );

  const sortedData = useMemo(
    () =>
      // fallback to empty array if data is undefined
      (data ?? [])
        .filter((d) => d.obs_start_dt.isValid && d.obs_end_dt.isValid)
        .sort((a, b) => a.obs_start_dt - b.obs_start_dt),
    [data],
  );

  const [gapWithFilterChange, gapWithoutFilterChange] = useMemo(() => {
    let filterChange = 0;
    let noFilterChange = 0;
    for (let i = 0; i < sortedData.length - 1; i++) {
      const currentExp = sortedData[i];
      const nextExp = sortedData[i + 1];
      if (nextExp.day_obs !== currentExp.day_obs) continue; // skip if not the same night
      const gap = nextExp.obs_start_dt - currentExp.obs_end_dt;
      if (currentExp.band === nextExp.band) {
        noFilterChange += gap;
      } else {
        filterChange += gap;
      }
    }
    return [filterChange / 3600000, noFilterChange / 3600000]; // convert ms to hours
  }, [sortedData]);

  const chartConfig = {
    gaps: {
      label: "Inter-Exposure time (same filter)",
      color: "hsl(200, 70%, 50%)",
    },
    gaps_filter_change: {
      label: "Inter-Exposure time (with filter change)",
      color: "hsl(40, 70%, 50%)",
    },
    fault: { label: "Fault", color: "hsl(0, 70%, 50%)" },
    weather: { label: "Weather", color: "hsl(80, 70%, 50%)" },
  };
  const chartData = [
    {
      name: "Gaps",
      value: gapWithoutFilterChange,
      color: "hsl(200, 70%, 50%)",
      label: "Inter-Exposure time (same filter)",
    },
    {
      name: "Gaps (Filter)",
      value: gapWithFilterChange,
      color: "hsl(40, 70%, 50%)",
      label: "Inter-Exposure time (with filter change)",
    },
    {
      name: "Fault",
      value: faultLoss,
      color: "hsl(0, 70%, 50%)",
      label: "Time lost to Faults",
    },
    {
      name: "Weather",
      value: weatherLoss,
      color: "hsl(80, 70%, 50%)",
      label: "Time lost to Weather",
    },
  ];

  return (
    <Card className="border-none p-0 bg-stone-800 gap-2">
      <CardHeader className="grid-cols-3 bg-teal-900 p-4 rounded-sm align-center gap-0">
        <CardTitle className="text-white font-thin col-span-2">
          Time Accounting
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
              <p>
                Breakdown of observable and non-observable time during selected
                dayobs range.
              </p>
              <br />

              <p>
                <strong>Observable Time:</strong> Total time between nautical
                twilights.
              </p>
              <br />

              <p>
                <strong>Exposures:</strong> Total exposure time where{" "}
                <code>can_see_sky</code> is <code>true</code>.
              </p>
              <br />

              <p>
                <strong>Not Exposures:</strong> Total inter-exposure time
                between nautical twilights.
              </p>
              <div>
                <ul className="p-2 list-inside list-disc">
                  <li>
                    <strong>Gaps:</strong> Inter-exposure time between exposures
                    (includes readout & slew)
                  </li>
                  <li>
                    <strong>Gaps (Filter):</strong> Inter-exposure time with
                    filter change
                  </li>
                  <li>
                    <strong>Fault:</strong> Time lost to faults (from narrative
                    log)
                  </li>
                  <li>
                    <strong>Weather:</strong> Time lost to weather (from
                    narrative log)
                  </li>
                </ul>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 bg-black p-4 text-neutral-200 rounded-sm border-2 border-teal-900 h-[320px] font-thin">
        {exposuresLoading || almanacLoading ? (
          <div className="flex-grow grid grid-cols-3 w-full h-full gap-2">
            <Skeleton className="col-span-1 h-full min-h-[180px] bg-stone-900" />
            <Skeleton className="col-span-2 h-full min-h-[180px] bg-stone-900" />
          </div>
        ) : (
          <div className="h-full w-full flex-grow min-w-0 grid grid-cols-3 grid-rows-6">
            <div className="col-span-1 flex flex-col items-center row-span-5">
              {nonExpPercent > 0 && (
                <div className="text-neutral-200 font-thin text-center">
                  Not exposures
                </div>
              )}
              <div className="h-56 w-15 text-teal-900 font-bold rounded-sm py-2">
                {nonExpPercent > 0 && (
                  <div
                    className={`bg-teal-100 max-h-36 min-h-6 ${
                      nonExpPercent === 100 ? "rounded-sm" : "rounded-t-sm"
                    } flex items-center justify-center`}
                    style={{ height: `${nonExpPercent}%` }}
                  >
                    {nonExpPercent} %
                  </div>
                )}
                {expPercent > 0 && (
                  <div
                    className={`h-4/5 bg-teal-900 text-teal-100 max-h-36 min-h-6 ${
                      expPercent === 100 ? "rounded-sm" : "rounded-b-sm"
                    } flex items-center justify-center`}
                    style={{ height: `${expPercent}%` }}
                  >
                    {expPercent} %
                  </div>
                )}
              </div>
              {expPercent > 0 && (
                <div className="text-neutral-200 font-thin">Exposures</div>
              )}
            </div>
            <div className="col col-span-2 row-span-5">
              <ChartContainer config={chartConfig} className="w-full h-full">
                <BarChart
                  width={380}
                  height={250}
                  data={chartData}
                  margin={{ top: 10, right: 10, left: 25, bottom: 0 }}
                >
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#ffffff" }}
                    angle={45}
                    interval={0}
                    height={60}
                    textAnchor="start"
                  />
                  <YAxis
                    width={5}
                    tick={{ fill: "#ffffff" }}
                    label={{
                      value: "Hours",
                      angle: -90,
                      position: "insideLeft",
                      fill: "white",
                      dx: -22,
                      dy: 10,
                    }}
                  />
                  <Bar dataKey="value" barSize="30" stackId="a">
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        label={entry.label}
                        radius={[4, 4, 0, 0]}
                      />
                    ))}
                    /
                  </Bar>
                  <ChartTooltip
                    cursor={false}
                    wrapperStyle={{ opacity: 0.9 }}
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      return (
                        <div className="bg-white text-xs p-2 border border-white rounded text-black font-light mb-1">
                          <div className="font-semibold">{`${payload[0].payload.label}`}</div>
                          <div>
                            Hours:{" "}
                            <span className="font-semibold">{`${payload[0].value.toFixed(
                              2,
                            )}`}</span>
                          </div>
                        </div>
                      );
                    }}
                  />
                </BarChart>
              </ChartContainer>
            </div>
            <div className="col-span-1 text-center flex flex-col pt-4 text-neutral-200">
              Observable time
            </div>
            <div className="col col-span-2 text-center pt-4 text-neutral-200">
              Time not exposing
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
export default TimeAccountingApplet;
