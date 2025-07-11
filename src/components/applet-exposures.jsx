// Applet: Display a breakdown of the exposures into type, reason, and program.

"use client";

import { useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
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

import { Cell, Bar, BarChart, XAxis, YAxis, Customized } from "recharts";

import InfoIcon from "../assets/InfoIcon.svg";
import DownloadIcon from "../assets/DownloadIcon.svg";

const PlotByValues = Object.freeze({
  NUMBER: "Number",
  TIME: "Time",
});

const GroupByValues = Object.freeze({
  OBSERVATION_REASON: "observation_reason",
  IMG_TYPE: "img_type",
  SCIENCE_PROGRAM: "science_program",
  TARGET_NAME: "target_name",
});

const SortByValues = Object.freeze({
  DEFAULT: "Default",
  ALPHABETICAL_ASC: "Alphabetical asc.",
  ALPHABETICAL_DESC: "Alphabetical desc.",
  HIGHEST_FIRST: "Highest number first",
  LOWEST_FIRST: "Lowest number first",
});

const PLOT_YLABELS_MAXSIZE = 14;
const BAR_SIZE = 35;

function AppletExposures({
  exposureFields,
  exposureCount,
  sumExpTime,
  flags,
  exposuresLoading = false,
  flagsLoading = false,
}) {
  const [plotBy, setPlotBy] = useState(PlotByValues.NUMBER);
  const [groupBy, setGroupBy] = useState(GroupByValues.SCIENCE_PROGRAM);
  const [sortBy, setSortBy] = useState(SortByValues.DEFAULT);
  const [hovered, setHovered] = useState(null);

  const plotByOptions = [
    { value: PlotByValues.NUMBER, label: "Number" },
    { value: PlotByValues.TIME, label: "Time (s)" },
  ];

  const groupByOptions = [
    { value: GroupByValues.OBSERVATION_REASON, label: "Obs. reason" },
    { value: GroupByValues.IMG_TYPE, label: "Img. type" },
    { value: GroupByValues.SCIENCE_PROGRAM, label: "Science program" },
    { value: GroupByValues.TARGET_NAME, label: "Target name" },
  ];

  const sortByOptions = [
    { value: SortByValues.DEFAULT, label: "Default" },
    { value: SortByValues.ALPHABETICAL_ASC, label: "Alphabetical asc." },
    { value: SortByValues.ALPHABETICAL_DESC, label: "Alphabetical desc." },
    { value: SortByValues.HIGHEST_FIRST, label: "Highest number first" },
    { value: SortByValues.LOWEST_FIRST, label: "Lowest number first" },
  ];

  const navigate = useNavigate();
  const { startDayobs, endDayobs, telescope } = useSearch({ from: "/" });

  const handleBarClick = (data) => {
    const filterField = groupBy;
    const selectedValue = data.groupKey;

    navigate({
      to: "/data-log",
      search: (prev) => ({
        ...prev,
        startDayobs,
        endDayobs,
        telescope,
        [filterField]: [selectedValue],
      }),
    });
  };

  const flaggedObsIds = new Set(flags.map((f) => f.obs_id));
  const aggregatedMap = {};

  let totalFlaggedCount = 0;
  let totalFlaggedTime = 0;

  if (Array.isArray(exposureFields)) {
    exposureFields.forEach((row) => {
      const rawValue = row[groupBy];
      const groupKey =
        rawValue === null || rawValue === undefined || rawValue === ""
          ? groupBy === GroupByValues.TARGET_NAME
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

      if (plotBy === PlotByValues.TIME) {
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

  const chartData = Object.values(aggregatedMap).map((entry, index) => {
    const totalValue = entry.unflagged + entry.flagged;
    return {
      groupKey: entry.groupKey,
      unflagged: entry.unflagged,
      flagged: entry.flagged,
      totalValue,
      fill: `hsl(${index * 40}, 70%, 50%)`,
      fill_flag: "#ffffff",
    };
  });

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
  const sorters = {
    [SortByValues.ALPHABETICAL_ASC]: (a, b) =>
      a.groupKey.localeCompare(b.groupKey),
    [SortByValues.ALPHABETICAL_DESC]: (a, b) =>
      b.groupKey.localeCompare(a.groupKey),
    [SortByValues.HIGHEST_FIRST]: (a, b) => b.totalValue - a.totalValue,
    [SortByValues.LOWEST_FIRST]: (a, b) => a.totalValue - b.totalValue,
  };

  if (sortBy !== SortByValues.DEFAULT) {
    chartData.sort(sorters[sortBy]);
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
            <PopoverContent className="bg-black text-white text-sm border-yellow-700 w-[300px]">
              This applet displays a breakdown of exposures taken during the
              night, grouped by a selected field.
              <br />
              <br />
              The chart can be configured to show either the{" "}
              <strong>number of exposures</strong> or the{" "}
              <strong>total exposure time (in seconds)</strong>.
              <br />
              <br />
              When exposures are flagged as "junk" or "questionable", they are
              shown in white at the end of the group’s bar.
              <br />
              <br />
              <strong>Tips:</strong> Hover over a bar to view total and flagged
              values. Scroll to see additional groups if all are not visible.
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 bg-black p-4 text-neutral-200 rounded-sm border-2 border-teal-900 h-[320px] font-thin">
        {exposuresLoading ? (
          <>
            {/* Skeleton outline */}
            {/* Plot display and controls */}
            <div className="flex-grow flex flex-row gap-8 overflow-hidden">
              {/* Plot display */}
              <div className="flex-grow flex flex-col overflow-hidden">
                <div className="flex-grow overflow-y-auto">
                  <Skeleton className="w-full h-full min-h-[180px] bg-stone-900" />
                </div>
              </div>

              {/* Controls */}
              <div className="w-[160px] flex flex-col gap-4">
                {[...Array(3)].map((_, idx) => (
                  <div className="flex flex-col gap-1" key={idx}>
                    <Skeleton className="h-4 w-16 bg-stone-900" />
                    <Skeleton className="h-8 w-[150px] bg-stone-900 rounded-s" />
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="text-[12px] flex flex-row gap-4 pt-2">
              <Skeleton className="h-4 w-full bg-stone-900" />
              <Skeleton className="h-4 w-full bg-stone-900" />
            </div>
          </>
        ) : (
          <>
            {/* Plot display and controls */}
            <div className="flex-grow flex flex-row gap-8 overflow-hidden">
              {exposureCount === 0 ? (
                <span className="w-full">
                  No exposures returned for selected dates.
                </span>
              ) : (
                <>
                  {/* Plot display */}
                  <div className="flex-grow overflow-y-auto">
                    <div
                      style={{
                        height: `${chartData.length * BAR_SIZE}px`,
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
                                  cursor="pointer"
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

                          {/* Transparent/highlighted layer for visibility/clickability */}
                          <Customized
                            component={({ width, data, yAxisMap }) => {
                              const yAxis = Object.values(yAxisMap)[0];
                              const bandwidth =
                                typeof yAxis.scale.bandwidth === "function"
                                  ? yAxis.scale.bandwidth()
                                  : BAR_SIZE;

                              return (
                                <g>
                                  {data.map((entry, index) => {
                                    const y = yAxis.scale(entry.groupKey);
                                    const offsetY =
                                      y + (bandwidth - BAR_SIZE) / 2;

                                    return (
                                      <rect
                                        key={`overlay-${index}`}
                                        x={0}
                                        y={offsetY}
                                        width={width}
                                        height={BAR_SIZE}
                                        fill={
                                          hovered === entry.groupKey
                                            ? "rgba(255,255,255,0.15)"
                                            : "transparent"
                                        }
                                        onMouseEnter={() =>
                                          setHovered(entry.groupKey)
                                        }
                                        onMouseLeave={() => setHovered(null)}
                                        onClick={() => handleBarClick(entry)}
                                        style={{ cursor: "pointer" }}
                                      />
                                    );
                                  })}
                                </g>
                              );
                            }}
                          />

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
                                  {payload.value.length > PLOT_YLABELS_MAXSIZE
                                    ? `${payload.value.slice(
                                        0,
                                        PLOT_YLABELS_MAXSIZE - 2,
                                      )}...`
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

                              const group = payload[0].payload.groupKey;
                              const unflagged = payload.find(
                                (d) => d.dataKey === "unflagged",
                              ).value;
                              const flagged = payload.find(
                                (d) => d.dataKey === "flagged",
                              ).value;

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

              {/* Plot controls */}
              <div className="w-[160px] flex flex-col gap-4">
                {/* Plot by */}
                <div>
                  <Label
                    htmlFor="plotBy"
                    className="text-white text-[12px] pb-1"
                  >
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

                {/* Group by */}
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

                {/* Sort by */}
                <div>
                  <Label
                    htmlFor="sortBy"
                    className="text-white text-[12px] pb-1"
                  >
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
            </div>

            {/* Totals */}
            <div className="text-[12px] flex flex-row gap-8 items-end">
              {plotBy === "Time" ? (
                <>
                  <div>Total exposure time: {sumExpTime} s</div>
                  <div className="flex flex-row items-end">
                    <span>Total flagged time:&nbsp;</span>
                    {flagsLoading ? (
                      <Skeleton className="h-4 w-12 bg-stone-900 inline-block" />
                    ) : (
                      <span>{totalFlaggedTime} s</span>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div>Total exposure count: {exposureCount}</div>
                  <div className="flex flex-row items-end">
                    <span>Total flagged:&nbsp;</span>
                    {flagsLoading ? (
                      <Skeleton className="h-4 w-12 bg-stone-900 inline-block" />
                    ) : (
                      <span>{totalFlaggedCount}</span>
                    )}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default AppletExposures;
