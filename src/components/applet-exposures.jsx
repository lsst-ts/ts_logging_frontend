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
import { Bar, BarChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import InfoIcon from "../assets/InfoIcon.svg";
import DownloadIcon from "../assets/DownloadIcon.svg";

function AppletExposures({ exposureFields, exposureCount, sumExpTime }) {
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

  // // Aggregate exposure count/time based on plotBy and groupBy
  // const aggregatedMap = exposureFields.reduce((acc, row) => {
  //   const groupKey = row[groupBy] ?? "Unknown";
  //   const expTime = parseFloat(row.exp_time ?? 0); // seconds

  //   if (!acc[groupKey]) {
  //     acc[groupKey] = { groupKey, totalExpCount: 0, totalExpTime: 0 };
  //   }

  //   acc[groupKey].totalExpCount += 1;
  //   acc[groupKey].totalExpTime += isNaN(expTime) ? 0 : expTime;

  //   return acc;
  // }, {});

  let aggregatedMap = {};

  if (Array.isArray(exposureFields)) {
    aggregatedMap = exposureFields.reduce((acc, row) => {
      const groupKey = row[groupBy] ?? "Unknown";
      const expTime = parseFloat(row.exp_time ?? 0); // seconds

      if (!acc[groupKey]) {
        acc[groupKey] = { groupKey, totalExpCount: 0, totalExpTime: 0 };
      }

      acc[groupKey].totalExpCount += 1;
      acc[groupKey].totalExpTime += isNaN(expTime) ? 0 : expTime;

      return acc;
    }, {});
  } else {
    console.warn("exposureFields is not an array:", exposureFields);
  }

  // Create array for chart data
  let chartData = Object.values(aggregatedMap).map((entry, index) => ({
    groupKey: entry.groupKey,
    totalExpCount: entry.totalExpCount,
    totalExpTime: entry.totalExpTime,
    fill: `hsl(${index * 40}, 70%, 50%)`, // generate unique colors
  }));

  // Required for chartContainer
  const chartConfig = chartData.reduce((config, entry) => {
    config[entry.groupKey] = {
      label: entry.groupKey,
      color: entry.fill,
    };
    return config;
  }, {});

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
              This applet displays a breakdown of the exposures taken during the
              night, grouped by the selected criteria (e.g., observation reason,
              image type, science program, or target name). The plot can be
              configured to show either the total number of exposures or the
              total exposure time in seconds. The data is sorted based on the
              selected criteria, allowing for easy analysis of the exposure
              distribution across different categories.
              <br />
              <br />
              <strong>Note:</strong> If there are more categories than can fit
              in the chart, you can scroll through the chart to see all of them.
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>

      <CardContent className="flex gap-8 bg-black p-4 text-neutral-200 rounded-sm border-2 border-teal-900 h-[320px] font-thin">
        {/* Plot display */}
        <div className="flex-grow flex flex-col justify-between gap-4">
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
                  <Bar
                    dataKey={
                      plotBy === "Time" ? "totalExpTime" : "totalExpCount"
                    }
                    layout="vertical"
                    barSize={20} // bar width
                    minPointSize={10} // make small bars visible
                    radius={[0, 4, 4, 0]}
                  />
                  <YAxis
                    dataKey="groupKey"
                    type="category"
                    axisLine={{ stroke: "#ffffff", strokeWidth: 2 }}
                    tickLine={false}
                    tick={{ fill: "#ffffff" }} // axis labels
                    tickMargin={2} // space for labels
                    tickFormatter={(value) => chartConfig[value]?.label}
                  />
                  <XAxis
                    dataKey={
                      plotBy === "Time" ? "totalExpTime" : "totalExpCount"
                    }
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
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                </BarChart>
              </ChartContainer>
            </div>
          </div>
          {/* Total */}
          <div className="text-[12px]">
            {plotBy === "Time" ? (
              <>Total exposure time: {sumExpTime} seconds</>
            ) : (
              <>Total exposure count: {exposureCount}</>
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
            <Label htmlFor="groupBy" className="text-white text-[12px] pb-1">
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
      </CardContent>
    </Card>
  );
}

export default AppletExposures;
