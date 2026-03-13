// components/UTCDatePicker.jsx
import * as React from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { ChevronDownIcon } from "lucide-react";
import { DatePicker } from "@/components/ui/datepicker";
import { DateTime } from "luxon";
import {
  calendarDateToLongFormat,
  utcDateToCalendarDate,
} from "@/utils/timeUtils";

/**
 * Converts a JS Date object to a Luxon DateTime object in UTC.
 *
 * @param {Date} calendarDate - The calendar date.
 * @returns {DateTime} The UTC date.
 */
function calendarDateToUtc(calendarDate) {
  if (!calendarDate) return null;
  const dateString = DateTime.fromJSDate(calendarDate).toFormat("yyyy-MM-dd");
  return DateTime.fromISO(dateString, { zone: "utc" }).toJSDate();
}

export function UTCDatePicker({ selectedDate, onDateChange, ...props }) {
  const [date, setDate] = React.useState(selectedDate);

  const handleChange = (newDate) => {
    if (!newDate) {
      setDate(null);
      return;
    }
    const utcDate = calendarDateToUtc(newDate);
    setDate(utcDate);
    onDateChange(utcDate);
  };

  const calendarDate = utcDateToCalendarDate(date);

  return (
    <DatePicker
      selectedDate={calendarDate}
      onDateChange={handleChange}
      buttonClassName="w-[200px] justify-between text-left font-normal rounded-md border-none shadow-[4px_4px_4px_0px_#3CAE3F] focus-visible:ring-4 focus-visible:ring-green-500/50"
      buttonContent={() => (
        <>
          <div className="flex flex-row gap-1 items-center">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? calendarDateToLongFormat(date) : "Pick a date"}
          </div>
          <ChevronDownIcon className="size-4 text-gray-500" />
        </>
      )}
      {...props}
    />
  );
}
