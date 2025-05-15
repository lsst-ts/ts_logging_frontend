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
  startDay,
  endDay,
  onStartDayChange,
  onEndDayChange,
  instrument,
  onInstrumentChange,
}) {
  return (
    <>
      <div className="pt-3">
        <Label htmlFor="instrument" className="text-white text-base pb-1">
          {" "}
          Instrument:{" "}
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
        <Label htmlFor="dayobsstart" className="text-white text-base pb-1">
          {" "}
          Dayobs (UTC) - start:{" "}
        </Label>
        <DatePicker
          id="dayobsstart"
          selectedDate={startDay}
          onDateChange={onStartDayChange}
        />
      </div>
      <div className="pt-8">
        <Label htmlFor="dayobsend" className="text-white text-base pb-1">
          {" "}
          Dayobs (UTC) - end:{" "}
        </Label>
        <DatePicker
          id="dayobsend"
          selectedDate={endDay}
          onDateChange={onEndDayChange}
        />
      </div>
    </>
  );
}

export default Parameters;
