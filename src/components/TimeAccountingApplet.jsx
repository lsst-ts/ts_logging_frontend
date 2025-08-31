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

  // console.log("Sorted Data:", sortedData);

  const [gapWithFilterChange, gapWithoutFilterChange] = useMemo(() => {
    let filterChange = 0;
    let noFilterChange = 0;
    for (let i = 0; i < sortedData.length - 1; i++) {
      const currentExp = sortedData[i];
      const nextExp = sortedData[i + 1];
      const gap =
        nextExp.day_obs === currentExp.day_obs
          ? nextExp.obs_start_dt - currentExp.obs_end_dt
          : 0;
      if (currentExp.band === nextExp.band) {
        noFilterChange += gap;
      } else {
        filterChange += gap;
      }
    }
    return [filterChange / 3600000, noFilterChange / 3600000];
  }, [sortedData]);

  const chartConfig = {
    gaps: { label: "Inter-Exposure", color: "hsl(80, 70%, 50%)" },
    gaps_filter_change: {
      label: "Inter-Exposure w/Filter Change",
      color: "hsl(40, 70%, 50%)",
    },
    fault: { label: "Fault", color: "hsl(0, 70%, 50%)" },
  };
  const chartData = [
    {
      name: "Gaps(Same Filter)",
      value: gapWithoutFilterChange,
      type: "gaps",
      color: "hsl(200, 70%, 50%)",
    },
    {
      name: "Gaps(Filter Change)",
      value: gapWithFilterChange,
      type: "gaps_filter_change",
      color: "hsl(40, 70%, 50%)",
    },
    { name: "Fault", value: 0, type: "fault", color: "hsl(0, 70%, 50%)" },
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
              Time Accounting Description.
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
          <div className="h-full w-full flex-grow min-w-0 grid grid-cols-3">
            <div className="col-span-1 flex flex-col items-center">
              {nonExpPercent > 0 && (
                <div className="text-neutral-200 font-thin">Not exposures</div>
              )}
              <div className="h-56 w-18 text-black font-bold rounded-sm py-2">
                {nonExpPercent > 0 && (
                  <div
                    className={`bg-sky-100 ${
                      nonExpPercent === 100 ? "rounded-sm" : "rounded-t-sm"
                    } flex items-center justify-center`}
                    style={{ height: `${nonExpPercent}%` }}
                  >
                    {nonExpPercent} %
                  </div>
                )}
                {expPercent > 0 && (
                  <div
                    className={`h-4/5 bg-teal-900 ${
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
            <div className="col col-span-2">
              <ChartContainer config={chartConfig} className="w-full h-full">
                <BarChart
                  width={400}
                  height={250}
                  data={chartData}
                  margin={{ top: 10, right: 10, left: 20, bottom: 5 }}
                >
                  <XAxis dataKey="name" tick={{ fill: "#ffffff" }} />
                  <YAxis width={5} tick={{ fill: "#ffffff" }} />
                  <Bar dataKey="value" barSize="20" stackId="a">
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
                    // cursor={{ fill: 'rgba(0, 0, 255, 0.1)', opacity: 0.2}}
                    cursor={false}
                    wrapperStyle={{ opacity: 0.9 }}
                  />
                </BarChart>
              </ChartContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
export default TimeAccountingApplet;
