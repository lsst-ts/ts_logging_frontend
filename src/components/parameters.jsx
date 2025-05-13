import * as React from "react";
import { ComboBox } from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/datepicker.jsx";

const instruments = [
  {
    value: "simonyi",
    label: "Simonyi",
  },
  {
    value: "auxtel",
    label: "AuxTel",
  },
];
function Parameters({
  startDay,
  endDay,
  onStartDayChange,
  onEndDayChange,
  instrument,
}) {
  return (
    <>
      <div className="pt-3">
        <Label htmlFor="instruments" className="text-white text-base pb-1">
          {" "}
          Instruments{" "}
        </Label>
        <ComboBox
          id="instruments"
          options={instruments}
          selectedValue={instrument}
        />
      </div>
      <div className="pt-8">
        <Label htmlFor="dayobsstart" className="text-white text-base pb-1">
          {" "}
          Dayobs - start{" "}
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
          Dayobs - end{" "}
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
