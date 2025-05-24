// Applet: Display a breakdown of the exposures into type, reason, and program.

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

import InfoIcon from "../assets/InfoIcon.svg";
import DownloadIcon from "../assets/DownloadIcon.svg";

function AppletExposures() {
  const [plotBy, setPlotBy] = useState("Number");
  const [groupBy, setGroupBy] = useState("Obs. reason");
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

      <CardContent className="grid gap-4 bg-black p-4 text-neutral-200 rounded-sm border-2 border-teal-900 h-80 font-thin">
        <div className="flex flex-row gap-4">
          <div className="border-2 border-teal-900 w-3/4 p-4">
            Insert chart of exposures here.
          </div>
          <div className="border-2 border-teal-900 w-1/4 p-4 flex flex-col gap-4">
            <div>
              <Label htmlFor="plotBy" className="text-white text-base pb-1">
                Plot exposures by:
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
        </div>
      </CardContent>
    </Card>
  );
}

export default AppletExposures;
