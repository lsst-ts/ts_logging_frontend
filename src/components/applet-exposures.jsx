// Applet: Display a breakdown of the exposures into type, reason, and program.

"use client";

import { useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";

import { Cell, Bar, BarChart, XAxis, YAxis } from "recharts";

import InfoIcon from "../assets/InfoIcon.svg";
import DownloadIcon from "../assets/DownloadIcon.svg";

function AppletExposures({
  exposureFields,
  exposureCount,
  sumExpTime,
  flags,
  exposuresLoading = false,
  flagsLoading = false,
}) {
  const [plotBy, setPlotBy] = useState("Number");
  const [groupBy, setGroupBy] = useState("science_program");
  const [sortBy, setSortBy] = useState("Default");

  const plotByOptions = [
    { value: "Number", label: "Number" },
    { value: "Time", label: "Time (s)" },
  ];

  const groupByOptions = [
    { value: "observation_reason", label: "Obs. reason" },
    { value: "img_type", label: "Img. type" },
    { value: "science_program", label: "Science program" },
    { value: "target_name", label: "Target name" },
  ];

  const sortByOptions = [
    { value: "Default", label: "Default" },
    { value: "Alphabetical asc.", label: "Alphabetical asc." },
    { value: "Alphabetical desc.", label: "Alphabetical desc." },
    { value: "Highest number first", label: "Highest number first" },
    { value: "Lowest number first", label: "Lowest number first" },
  ];

  const flaggedObsIds = new Set(flags.map((f) => f.obs_id));
  const aggregatedMap = {};

  let totalFlaggedCount = 0;
  let totalFlaggedTime = 0;

  if (Array.isArray(exposureFields)) {
    exposureFields.forEach((row) => {
      const rawValue = row[groupBy];
      const groupKey =
        rawValue === null || rawValue === undefined || rawValue === ""
          ? groupBy === "target_name"
            ? "No target"
            : "Unknown"
          : rawValue;
      const expTime = parseFloat(row.exp_time ?? 0);
      const isFlagged = flaggedObsIds.has(row.exposure_name);

      if (!aggregatedMap[groupKey]) {
        aggregatedMap[groupKey] = {
          groupKey,
          unflagged: 0,
          flagged: 0,
        };
      }

      if (plotBy === "Time") {
        if (isFlagged) {
          const time = isNaN(expTime) ? 0 : expTime;
          aggregatedMap[groupKey].flagged += time;
          totalFlaggedTime += time;
          totalFlaggedCount += 1;
        } else {
          aggregatedMap[groupKey].unflagged += isNaN(expTime) ? 0 : expTime;
        }
      } else {
        if (isFlagged) {
          aggregatedMap[groupKey].flagged += 1;
          totalFlaggedCount += 1;
        } else {
          aggregatedMap[groupKey].unflagged += 1;
        }
      }
    });
  } else {
    console.warn("exposureFields is not an array:", exposureFields);
  }

  const flagCount = totalFlaggedCount;
  const sumFlaggedTime = totalFlaggedTime;

  const chartData = Object.values(aggregatedMap).map((entry, index) => ({
    groupKey: entry.groupKey,
    unflagged: entry.unflagged,
    flagged: entry.flagged,
    fill: `hsl(${index * 40}, 70%, 50%)`,
    fill_flag: "#ffffff",
  }));

  const chartConfig = {
    unflagged: {
      label: "Unflagged",
      color: "",
    },
    flagged: {
      label: "Flagged",
      color: "#ffffff",
    },
  };

  // Sort chartData based on sortBy
  if (sortBy === "Alphabetical asc.") {
    chartData.sort((a, b) =>
      (a.groupKey || "").localeCompare(b.groupKey || ""),
    );
  } else if (sortBy === "Alphabetical desc.") {
    chartData.sort((a, b) =>
      (b.groupKey || "").localeCompare(a.groupKey || ""),
    );
  } else if (sortBy === "Highest number first") {
    chartData.sort((a, b) =>
      plotBy === "Time"
        ? b.totalExpTime - a.totalExpTime
        : b.totalExpCount - a.totalExpCount,
    );
  } else if (sortBy === "Lowest number first") {
    chartData.sort((a, b) =>
      plotBy === "Time"
        ? a.totalExpTime - b.totalExpTime
        : a.totalExpCount - b.totalExpCount,
    );
  }

  return (
    <Card className="border-none p-0 bg-stone-800 gap-2">
      <CardHeader className="grid-cols-3 bg-teal-900 p-4 rounded-sm align-center gap-0">
        <CardTitle className="text-white font-thin col-span-2">
          Exposure Breakdown
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
            <PopoverContent className="bg-black text-white text-sm border-yellow-700">
              This applet displays a breakdown of exposures taken during the
              night, grouped by a selected field (e.g., observation reason,
              image type, science program, or target name).
              <br />
              <br />
              The chart can be configured to show either the{" "}
              <strong>number of exposures</strong>
              or the <strong>total exposure time (in seconds)</strong>. Groups
              can also be sorted to better visualise the distribution across
              categories.
              <br />
              <br />
              If any exposures in a group have been flagged as "junk" or
              "questionable", a white segment appears at the end of that group's
              bar, stacked on top of the unflagged portion.
              <br />
              <br />
              <strong>Tip:</strong> Hover over a bar to view flagged and
              unflagged values. Scroll to see additional groups if all are not
              visible.
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>

      <CardContent className="flex gap-8 bg-black p-4 text-neutral-200 rounded-sm border-2 border-teal-900 h-[320px] font-thin">
        {exposuresLoading ? (
          <>
            {/* Skeleton outline */}
            <div className="flex-grow flex flex-col justify-between gap-4">
              <div className="flex-grow overflow-y-auto">
                <Skeleton className="w-full h-full min-h-[180px] bg-stone-900" />
              </div>
              <div className="text-[12px] flex flex-row gap-4">
                <Skeleton className="h-4 w-full bg-stone-900" />
                <Skeleton className="h-4 w-full bg-stone-900" />
              </div>
            </div>
            <div className="w-[160px] flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <Skeleton className="h-4 w-16 bg-stone-900" />
                <Skeleton className="h-8 w-[150px] bg-stone-900 rounded-s" />
              </div>
              <div className="flex flex-col gap-1">
                <Skeleton className="h-4 w-16 bg-stone-900" />
                <Skeleton className="h-8 w-[150px] bg-stone-900 rounded-s" />
              </div>
              <div className="flex flex-col gap-1">
                <Skeleton className="h-4 w-16 bg-stone-900" />
                <Skeleton className="h-8 w-[150px] bg-stone-900 rounded-s" />
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Plot display */}
            <div className="flex-grow flex flex-col justify-between gap-4">
              {exposureCount === 0 ? (
                <>
                  <span>No exposures returned for selected dates.</span>
                </>
              ) : (
                <>
                  <div className="flex-grow overflow-y-auto">
                    <div
                      style={{
                        height: `${chartData.length * 35}px`,
                        minHeight: "180px",
                      }}
                    >
                      <ChartContainer
                        config={chartConfig}
                        className="w-full h-full !aspect-auto"
                      >
                        <BarChart
                          data={chartData}
                          layout="vertical"
                          margin={{
                            left: 30,
                          }}
                        >
                          {/* Unflagged data stacked bar (bottom) */}
                          <Bar
                            dataKey="unflagged"
                            stackId="a"
                            barSize={20}
                            minPointSize={1}
                            isAnimationActive={false}
                          >
                            {/* Round corners when no flagged data */}
                            {chartData.map((entry, index) => {
                              const isOnlyUnflagged = entry.flagged === 0;
                              return (
                                <Cell
                                  key={`cell-unflagged-${index}`}
                                  fill={entry.fill}
                                  radius={
                                    isOnlyUnflagged
                                      ? [0, 4, 4, 0]
                                      : [0, 0, 0, 0]
                                  }
                                />
                              );
                            })}
                          </Bar>

                          {/* Flagged data stacked bar (top) */}
                          <Bar
                            dataKey="flagged"
                            stackId="a"
                            barSize={20}
                            isAnimationActive={false}
                          >
                            {chartData.map((entry, index) => (
                              <Cell
                                key={`cell-flagged-${index}`}
                                fill="#ffffff"
                                radius={[0, 4, 4, 0]}
                              />
                            ))}
                          </Bar>

                          {/* Axes, ticks, labels and styles */}
                          <YAxis
                            dataKey="groupKey"
                            type="category"
                            axisLine={{ stroke: "#ffffff", strokeWidth: 2 }}
                            tickLine={false}
                            // Custom tick component for wrapping long labels
                            tick={({ x, y, payload }) => (
                              (<title>{payload.value}</title>),
                              (
                                <text
                                  x={x}
                                  y={y}
                                  dy={4}
                                  textAnchor="end"
                                  fill="#ffffff"
                                  fontSize={10}
                                >
                                  {payload.value.length > 14
                                    ? `${payload.value.slice(0, 12)}...`
                                    : payload.value}
                                </text>
                              )
                            )}
                            tickMargin={2}
                            tickFormatter={(value) =>
                              value === "Unknown" && groupBy === "target_name"
                                ? "No target"
                                : value
                            }
                          />
                          <XAxis
                            type="number"
                            orientation="top"
                            axisLine={{ stroke: "#ffffff", strokeWidth: 2 }}
                            tickLine={{ stroke: "#ffffff", strokeWidth: 2 }}
                            tick={{ fill: "#ffffff", fontSize: 12 }}
                            label={{
                              value:
                                plotBy === "Time"
                                  ? "Exposure time (s)"
                                  : "Number of exposures",
                              position: "insideTop",
                              offset: 0,
                              fill: "#ffffff",
                              style: { fontSize: 12 },
                            }}
                          />

                          {/* Tooltip content and styles  */}
                          <ChartTooltip
                            cursor={false}
                            content={({ active, payload }) => {
                              if (!active || !payload || payload.length === 0)
                                return null;

                              const group =
                                payload[0].payload.groupKey || "No target";
                              const unflagged =
                                payload.find((d) => d.dataKey === "unflagged")
                                  ?.value || 0;
                              const flagged =
                                payload.find((d) => d.dataKey === "flagged")
                                  ?.value || 0;

                              return (
                                <div className="bg-white text-black text-xs p-2 border border-white rounded">
                                  <div className="font-bold">
                                    {group}:{" "}
                                    <strong className="font-extra-bold">
                                      {unflagged + flagged}
                                    </strong>
                                  </div>
                                  {flagged > 0 && <div>Flagged: {flagged}</div>}
                                </div>
                              );
                            }}
                          />
                        </BarChart>
                      </ChartContainer>
                    </div>
                  </div>
                </>
              )}

              {/* Totals */}
              <div className="text-[12px] flex flex-row gap-4">
                {plotBy === "Time" ? (
                  <>
                    <div className="w-full">
                      Total exposure time: {sumExpTime} s
                    </div>
                    <div className="w-full flex">
                      <span>Total flagged time:&nbsp;</span>
                      {flagsLoading ? (
                        <Skeleton className="h-4 w-12 bg-stone-900 inline-block" />
                      ) : (
                        <span>{sumFlaggedTime} s</span>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-full">
                      Total exposure count: {exposureCount}
                    </div>
                    <div className="w-full flex">
                      <span>Total flagged:&nbsp;</span>
                      {flagsLoading ? (
                        <Skeleton className="h-4 w-12 bg-stone-900 inline-block" />
                      ) : (
                        <span>{flagCount}</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Plot controls */}
            <div className="w-[160px] flex flex-col gap-4">
              <div>
                <Label htmlFor="plotBy" className="text-white text-[12px] pb-1">
                  Plot by:
                </Label>
                <Select value={plotBy} onValueChange={setPlotBy}>
                  <SelectTrigger
                    id="plotBy"
                    size="sm"
                    className="w-[150px] bg-teal-800 justify-between font-normal text-[12px] text-white rounded-s shadow-[4px_4px_4px_0px_#3CAE3F] border-2 border-white focus-visible:ring-4 focus-visible:ring-green-500/50"
                    chevronDownIconClassName="text-white"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-teal-800 border-2 border-white">
                    {plotByOptions.map((option) => (
                      <SelectItem
                        className="text-white text-[12px] focus:bg-teal-700 focus:text-white"
                        checkIconClassName="text-white"
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label
                  htmlFor="groupBy"
                  className="text-white text-[12px] pb-1"
                >
                  Group by:
                </Label>
                <Select value={groupBy} onValueChange={setGroupBy}>
                  <SelectTrigger
                    id="groupBy"
                    size="sm"
                    className="w-[150px] bg-teal-800 justify-between font-normal text-[12px] text-white rounded-s shadow-[4px_4px_4px_0px_#3CAE3F] border-2 border-white focus-visible:ring-4 focus-visible:ring-green-500/50"
                    chevronDownIconClassName="text-white"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-teal-800 border-2 border-white">
                    {groupByOptions.map((option) => (
                      <SelectItem
                        className="text-white text-[12px] focus:bg-teal-700 focus:text-white"
                        checkIconClassName="text-white"
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="sortBy" className="text-white text-[12px] pb-1">
                  Sort by:
                </Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger
                    id="sortBy"
                    size="sm"
                    className="w-[150px] bg-teal-800 justify-between font-normal text-[12px] text-white rounded-s shadow-[4px_4px_4px_0px_#3CAE3F] border-2 border-white focus-visible:ring-4 focus-visible:ring-green-500/50"
                    chevronDownIconClassName="text-white"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-teal-800 border-2 border-white">
                    {sortByOptions.map((option) => (
                      <SelectItem
                        className="text-white text-[12px] focus:bg-teal-700 focus:text-white"
                        checkIconClassName="text-white"
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default AppletExposures;
