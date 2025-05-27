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

const TELESCOPES = Object.freeze({
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
  return (
    <>
      <div className="pt-3">
        <Label htmlFor="instrument" className="text-white text-base pb-1">
          {" "}
          Telescope:{" "}
        </Label>
        <Select value={instrument} onValueChange={onInstrumentChange}>
          <SelectTrigger
            id="instrument"
            className="w-[200px] bg-white justify-between font-normal rounded-s shadow-[4px_4px_4px_0px_#3CAE3F] focus-visible:ring-4 focus-visible:ring-green-500/50"
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
          {" "}
          Night (dayobs){" "}
        </Label>
        <DatePicker
          id="dayobs"
          selectedDate={dayobs}
          onDateChange={onDayobsChange}
        />
      </div>
      <div className="pt-8">
        <Label htmlFor="dayobsend" className="text-white text-base pb-1">
          Number of Nights
        </Label>
        <Input
          type="number"
          id="noOfNights"
          min="1"
          value={noOfNights}
          onValueChange={onNoOfNightsChange}
        />
      </div>
    </>
  );
}

export default Parameters;
