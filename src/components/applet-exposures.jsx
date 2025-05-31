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
  // ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import InfoIcon from "../assets/InfoIcon.svg";
import DownloadIcon from "../assets/DownloadIcon.svg";

function AppletExposures() {
  const [plotBy, setPlotBy] = useState("Number");
  const [groupBy, setGroupBy] = useState("Science program");
  const [sortBy, setSortBy] = useState("Default");

  const plotByOptions = [
    { value: "Number", label: "Number" },
    { value: "Time", label: "Time" },
  ];

  const groupByOptions = [
    { value: "Obs. reason", label: "Obs. reason" },
    { value: "Obs. type", label: "Obs. type" },
    { value: "Science program", label: "Science program" },
  ];

  const sortByOptions = [
    { value: "Default", label: "Default" },
    { value: "Alphabetical asc.", label: "Alphabetical asc." },
    { value: "Alphabetical desc.", label: "Alphabetical desc." },
    { value: "Highest number first", label: "Highest number first" },
    { value: "Lowest number first", label: "Lowest number first" },
  ];

  const chartData = [
    { browser: "chrome", exposures: 275, fill: "#9c27b0" },
    { browser: "safari", exposures: 200, fill: "#ff9800" },
    { browser: "firefox", exposures: 187, fill: "#4caf50" },
    { browser: "edge", exposures: 173, fill: "#2196f3" },
    { browser: "other", exposures: 90, fill: "#607d8b" },
    { browser: "other1", exposures: 3, fill: "#777d8b" },
    { browser: "other2", exposures: 20, fill: "#607fde" },
    { browser: "other3", exposures: 42, fill: "#649dee" },
    { browser: "other4", exposures: 160, fill: "#107aab" },
    { browser: "other5", exposures: 3, fill: "#777d8b" },
    { browser: "other6", exposures: 20, fill: "#607fde" },
    { browser: "other7", exposures: 42, fill: "#649dee" },
    { browser: "other8", exposures: 160, fill: "#107aab" },
  ];

  // const rowHeight = 30; // or 40, depending on desired bar spacing
  // const chartHeight = chartData.length * rowHeight;

  const chartConfig = {
    visitors: {
      label: "Exposures",
    },
    chrome: {
      label: "BLOCK-295",
      color: "hsl(var(--chart-1))",
    },
    safari: {
      label: "BLOCK-305",
      color: "hsl(var(--chart-2))",
    },
    firefox: {
      label: "BLOCK-306",
      color: "hsl(var(--chart-3))",
    },
    edge: {
      label: "BLOCK-T17",
      color: "hsl(var(--chart-4))",
    },
    other: {
      label: "spec-survey",
      color: "hsl(var(--chart-5))",
    },
    other1: {
      label: "B469469",
      color: "hsl(var(--chart-5))",
    },
    other2: {
      label: "BLOCK-864",
      color: "hsl(var(--chart-5))",
    },
    other3: {
      label: "BLOCK-T33",
      color: "hsl(var(--chart-5))",
    },
    other4: {
      label: "unknown",
      color: "hsl(var(--chart-5))",
    },
    other5: {
      label: "B469469",
      color: "hsl(var(--chart-5))",
    },
    other6: {
      label: "BLOCK-864",
      color: "hsl(var(--chart-5))",
    },
    other7: {
      label: "BLOCK-T33",
      color: "hsl(var(--chart-5))",
    },
    other8: {
      label: "unknown",
      color: "hsl(var(--chart-5))",
    },
  };

  // Custom shape for bars - 2 rounded corners
  const CustomBarShape = (props) => {
    const { fill, x, y, width, height } = props;

    return (
      <path
        d={`M${x},${y} 
           h${width - 5} 
           a5,5 0 0 1 5,5 
           v${height - 10} 
           a5,5 0 0 1 -5,5 
           h-${width - 5} 
           z`}
        fill={fill}
        stroke="none"
      />
    );
  };

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
            <PopoverContent>
              This is a placeholder for the download/export button. Once
              implemented, clicking here will download this Applet's data to a
              .csv file.
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger className="self-end min-w-4">
              <img src={InfoIcon} />
            </PopoverTrigger>
            <PopoverContent>
              This is a placeholder for the info button. Clicking here will
              display detailed information on the data displayed in this Applet,
              instructions on how to use any controls, and where the user will
              be taken if they click on certain linked sections of the Applet.
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      <CardContent className="flex gap-4 bg-black p-4 text-neutral-200 rounded-sm border-2 border-teal-900 h-80 font-thin">
        {/* Plot display */}
        <div className="border-2 border-teal-900 flex-grow p-4 h-[282px] overflow-y-auto">
          <div
            style={{
              height: `${chartData.length * 30}px`,
              minHeight: "282px",
            }}
          >
            <ChartContainer config={chartConfig} className="w-full h-full">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{
                  left: 30,
                }}
                // barCategoryGap="10%"  // not work?
                // barGap={10}  // not work?
                // height={100} // not work?
              >
                <Bar
                  dataKey="exposures"
                  layout="vertical"
                  barSize={20}
                  shape={<CustomBarShape />}
                />
                <YAxis
                  dataKey="browser"
                  type="category"
                  axisLine={{ stroke: "#ffffff", strokeWidth: 2 }}
                  tickLine={false}
                  tick={{ fill: "#ffffff" }} // axis labels
                  tickMargin={10} // space for labels
                  tickFormatter={(value) => chartConfig[value]?.label}
                />
                <XAxis
                  dataKey="exposures"
                  type="number"
                  orientation="top"
                  axisLine={{ stroke: "#ffffff", strokeWidth: 2 }}
                  tickLine={{ stroke: "#ffffff", strokeWidth: 2 }}
                  tick={{ fill: "#ffffff", fontSize: 12 }}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
              </BarChart>
            </ChartContainer>
          </div>
        </div>

        {/* Plot controls */}
        <div className="border-2 border-teal-900 w-[190px] p-4 flex flex-col gap-4">
          <div>
            <Label htmlFor="plotBy" className="text-white text-base pb-1">
              Plot by:
            </Label>
            <Select value={plotBy} onValueChange={setPlotBy}>
              <SelectTrigger
                id="plotBy"
                className="w-[150px] bg-teal-800 justify-between font-normal text-white rounded-s shadow-[4px_4px_4px_0px_#3CAE3F] border-2 border-white focus-visible:ring-4 focus-visible:ring-green-500/50"
                chevronDownIconClassName="text-white"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-teal-800 border-2 border-white">
                {plotByOptions.map((option) => (
                  <SelectItem
                    className="text-white focus:bg-teal-700 focus:text-white"
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
            <Label htmlFor="groupBy" className="text-white text-base pb-1">
              Group by:
            </Label>
            <Select value={groupBy} onValueChange={setGroupBy}>
              <SelectTrigger
                id="groupBy"
                className="w-[150px] bg-teal-800 justify-between font-normal text-white rounded-s shadow-[4px_4px_4px_0px_#3CAE3F] border-2 border-white focus-visible:ring-4 focus-visible:ring-green-500/50"
                chevronDownIconClassName="text-white"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-teal-800 border-2 border-white">
                {groupByOptions.map((option) => (
                  <SelectItem
                    className="text-white focus:bg-teal-700 focus:text-white"
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
            <Label htmlFor="sortBy" className="text-white text-base pb-1">
              Sort by:
            </Label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger
                id="sortBy"
                className="w-[150px] bg-teal-800 justify-between font-normal text-white rounded-s shadow-[4px_4px_4px_0px_#3CAE3F] border-2 border-white focus-visible:ring-4 focus-visible:ring-green-500/50"
                chevronDownIconClassName="text-white"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-teal-800 border-2 border-white">
                {sortByOptions.map((option) => (
                  <SelectItem
                    className="text-white focus:bg-teal-700 focus:text-white"
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
