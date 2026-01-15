import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/datepicker.jsx";
import { Input } from "@/components/ui/input";

import { useHostConfig } from "@/contexts/HostConfigContext";

import { getDisplayDateRange } from "@/utils/utils";
import { DateTime } from "luxon";

export const TELESCOPES = Object.freeze({
  AuxTel: "LATISS",
  Simonyi: "LSSTCam",
});

const instruments = Object.keys(TELESCOPES).map((key) => {
  return {
    value: TELESCOPES[key],
    label: key,
  };
});

function Parameters({
  dayobs,
  noOfNights,
  onDayobsChange,
  onNoOfNightsChange,
  instrument,
  onInstrumentChange,
}) {
  const displayRange = getDisplayDateRange(dayobs, noOfNights);
  const { getAvailableDayObsRange } = useHostConfig();

  const dateRange = getAvailableDayObsRange();
  const maxDayObs_dt = DateTime.fromFormat(
    dateRange.max,
    "yyyyLLdd",
  ).toJSDate();
  const minDayObs_dt =
    dateRange.min === null
      ? dateRange.min
      : DateTime.fromFormat(dateRange.min, "yyyyLLdd").toJSDate();

  return (
    <>
      {/* Inputs */}
      <div className="pt-3">
        <Label htmlFor="instrument" className="text-white text-base pb-1">
          Telescope
        </Label>
        <Select value={instrument} onValueChange={onInstrumentChange}>
          <SelectTrigger
            id="instrument"
            className="w-[200px] bg-white justify-between font-normal shadow-[4px_4px_4px_0px_#3CAE3F] focus-visible:ring-4 focus-visible:ring-green-500/50"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {instruments.map((instr) => (
              <SelectItem key={instr.value} value={instr.value}>
                {instr.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="pt-8">
        <Label htmlFor="dayobs" className="text-white text-base pb-1">
          Night (dayobs)
        </Label>
        <DatePicker
          id="dayobs"
          selectedDate={dayobs}
          onDateChange={onDayobsChange}
          disabled={{
            before: minDayObs_dt,
            after: maxDayObs_dt,
          }}
        />
      </div>
      <div className="pt-8">
        <Label htmlFor="noOfNights" className="text-white text-base pb-1">
          Number of Nights
        </Label>
        <small
          id="noOfNights-description"
          className="text-xs text-white font-extralight block pb-1"
        >
          *up to and including selected dayobs
        </small>
        <Input
          type="number"
          id="noOfNights"
          min="1"
          value={noOfNights}
          onValueChange={onNoOfNightsChange}
          aria-describedby="noOfNights-description"
        />
      </div>

      {/* Date range display */}
      <div className="pt-12">
        <span className="text-[14px] font-extralight text-white bg-green-500/20 px-2 py-2 rounded-md whitespace-nowrap">
          <span className="font-semibold text-[12px]">dayobs: </span>
          {displayRange}
        </span>
      </div>
    </>
  );
}

export default Parameters;
