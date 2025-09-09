import * as React from "react";
import { format } from "date-fns";
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

export function DatePicker({ selectedDate, onDateChange, mode = "single" }) {
  const [date, setDate] = React.useState(selectedDate);

  const handleChange = (newDate) => {
    setDate(newDate);
    if (newDate) {
      onDateChange(newDate);
    }
  };

  function formatDisplay(date) {
    if (mode === "range" && date && typeof date === "object") {
      const { from, to } = date;
      const fromStr =
        from instanceof Date && !isNaN(from) ? format(from, "PPP") : "";
      const toStr = to instanceof Date && !isNaN(to) ? format(to, "PPP") : "";
      if (fromStr && toStr) return `${fromStr} – ${toStr}`;
      if (fromStr) return `From ${fromStr}`;
      if (toStr) return `Until ${toStr}`;
      return "Pick a date range";
    }

    if (date instanceof Date && !isNaN(date)) {
      return format(date, "PPP");
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
          selected={date}
          onSelect={handleChange}
          defaultMonth={new Date(date?.getFullYear(), date?.getMonth())}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
