import * as React from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { ChevronDownIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { DateTime } from "luxon";
import { calendarDateToLongFormat } from "@/utils/timeUtils";

/**
 * Converts a UTC Date object to a local Date object that can be used with the calendar component.
 *
 * The calendar component expects a local date, but we want to ensure that the date is treated as UTC.
 * To achieve this, we create a new Date object using the year, month, and day from the UTC date,
 * which effectively gives us a local date that corresponds to the same calendar day in UTC.
 *
 * @param {Date} utcDate - The input JS date in UTC.
 * @returns {Date} A local JS Date object that represents the same calendar day as the input UTC date.
 */
function utcDateToCalendarDate(utcDate) {
  if (!utcDate) return undefined;
  const d = DateTime.fromJSDate(utcDate, { zone: "utc" });
  // Create a local date with the same year/month/day as the UTC date
  return new Date(d.year, d.month - 1, d.day);
}

export function DatePicker({
  selectedDate,
  onDateChange,
  mode = "single",
  ...props
}) {
  const [date, setDate] = React.useState(selectedDate);

  const handleChange = (newDate) => {
    if (!newDate) {
      setDate(null);
      return;
    }
    // Create a UTC Date object from the selected date
    const dateString = DateTime.fromJSDate(newDate).toFormat("yyyy-MM-dd");
    const utcDate = DateTime.fromISO(dateString, { zone: "utc" }).toJSDate();
    setDate(utcDate);
    onDateChange(utcDate);
  };

  // Convert UTC → calendar-safe local date for display
  const calendarDate = utcDateToCalendarDate(date);

  function formatDisplay(date) {
    if (
      mode === "range" &&
      date &&
      typeof date === "object" &&
      !(date instanceof Date)
    ) {
      const { from, to } = date;
      const fromStr = calendarDateToLongFormat(from);
      const toStr = calendarDateToLongFormat(to);

      if (fromStr && toStr) return `${fromStr} – ${toStr}`;
      if (fromStr) return `From ${fromStr}`;
      if (toStr) return `Until ${toStr}`;
      return "Pick a date range";
    }

    if (date instanceof Date && !isNaN(date)) {
      return calendarDateToLongFormat(date);
    }

    return "Pick a date";
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-[200px] justify-between text-left font-normal rounded-md border-none shadow-[4px_4px_4px_0px_#3CAE3F] focus-visible:ring-4 focus-visible:ring-green-500/50",
            !date && "text-muted-foreground",
          )}
        >
          <div className="flex flex-row gap-1 items-center">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDisplay(date)}
          </div>
          <ChevronDownIcon className="size-4 text-gray-500" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode={mode}
          selected={calendarDate}
          onSelect={handleChange}
          defaultMonth={
            new Date(calendarDate?.getFullYear(), calendarDate?.getMonth())
          }
          initialFocus
          {...props}
        />
      </PopoverContent>
    </Popover>
  );
}
