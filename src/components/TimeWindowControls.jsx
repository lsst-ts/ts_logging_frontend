import { DateTime } from "luxon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export default function TimeWindowControls({
  fullTimeRange,
  selectedTimeRange,
  setSelectedTimeRange,
  availableDayobs,
}) {
  const [fullXMin, fullXMax] = fullTimeRange;
  let [currentXMin, currentXMax] = selectedTimeRange;
  if (!fullXMin || !fullXMax) {
    return null;
  }

  return (
    <div className="flex flex-row justify-between mt-4 gap-8 text-white">
      {/* Time Inputs */}
      <div className="flex flex-row gap-4">
        {/* Time Labels */}
        <div className="flex flex-col gap-4">
          <Label
            htmlFor="start-time-input"
            className="h-9 w-18 !items-left text-start"
          >
            Start (TAI):
          </Label>
          <Label htmlFor="end-time-input" className="h-9 w-18 !text-left">
            End (TAI):
          </Label>
        </div>

        {/* Time inputs */}
        <div className="flex flex-col gap-4">
          <Input
            type="time" // this is browser dependent and behaves differently in different browsers
            id="start-time-input"
            step="60"
            lang="en-GB"
            inputMode="numeric"
            pattern="[0-9]{2}:[0-9]{2}"
            className="max-w-[100px] bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
            value={DateTime.fromMillis(currentXMin, { zone: "utc" }).toFormat(
              "HH:mm",
            )}
            onChange={(e) => {
              const [h, m] = e.target.value.split(":").map(Number);
              const newStart = DateTime.fromMillis(currentXMin)
                .set({ hour: h, minute: m })
                .toMillis();
              setSelectedTimeRange([newStart, currentXMax]);
            }}
          />
          <Input
            type="time"
            id="end-time-input"
            step="60"
            lang="en-GB"
            inputMode="numeric"
            pattern="[0-9]{2}:[0-9]{2}"
            className="max-w-[100px] bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
            value={DateTime.fromMillis(currentXMax, { zone: "utc" }).toFormat(
              "HH:mm",
            )}
            onChange={(e) => {
              const [h, m] = e.target.value.split(":").map(Number);
              const newEnd = DateTime.fromMillis(currentXMax)
                .set({ hour: h, minute: m })
                .toMillis();
              setSelectedTimeRange([currentXMin, newEnd]);
            }}
          />
        </div>

        {/* Dayobs Labels */}
        <div className="flex flex-col gap-4">
          <Label
            htmlFor="start-dayobs-input"
            className="ml-2 h-9 w-22 !items-left text-start"
          >
            Start Dayobs:
          </Label>
          <Label
            htmlFor="end-dayobs-input"
            className="ml-2 h-9 w-22 !items-left text-start"
          >
            End Dayobs:
          </Label>
        </div>

        {/* Dayobs inputs */}
        <div className="flex flex-col gap-4">
          {/* Start dayobs */}
          <Select
            id="start-dayobs-input"
            // Get dayobs from TAI window start time
            value={(() => {
              const toReturn = DateTime.fromMillis(currentXMin, { zone: "utc" })
                .minus({ hours: 12, seconds: 37 })
                .toFormat("yyyyLLdd");
              console.log("value shown on start dayobs: ", toReturn);
              return toReturn;
            })()}
            onValueChange={(newDayobsStr) => {
              // Get new dayobs
              const dayobsStart = DateTime.fromFormat(
                newDayobsStr,
                "yyyyLLdd",
                {
                  zone: "utc",
                },
              );
              // midnight prior to dayobs (correct)
              console.log("dayobsStart: ", dayobsStart);

              // midday 21st (correct)
              console.log("currentXMin: ", currentXMin);
              console.log(
                "currentXMin (UTC): ",
                DateTime.fromMillis(currentXMin, { zone: "utc" }),
              );

              // Get start time from window
              const [h, m] = DateTime.fromMillis(currentXMin, { zone: "utc" })
                .minus({ seconds: 37 })
                .toFormat("HH:mm")
                .split(":")
                .map(Number);
              console.log("h, m: ", h, m);

              // Set new datetime
              // If in second half of dayobs -> set as next day
              const dayobsToDate =
                h < 12 ? dayobsStart.plus({ days: 1 }) : dayobsStart;
              // midnight prior to dayobs (correct)
              console.log("dayobsToDate: ", dayobsToDate);

              const dt = dayobsToDate
                .set({ hour: h, minute: m, second: 37 })
                .setZone("utc");
              // midday 22nd (correct)
              console.log("dt: ", dt);

              // Set window
              if (dt.isValid) {
                setSelectedTimeRange([dt.toMillis(), currentXMax]);
              }
            }}
          >
            <SelectTrigger
              id="start-dayobs-select"
              className="w-[120px] bg-white text-black justify-between font-normal shadow-[4px_4px_4px_0px_#3CAE3F] focus-visible:ring-4 focus-visible:ring-green-500/50"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableDayobs.map((dayobs) => (
                <SelectItem key={dayobs} value={dayobs}>
                  {dayobs}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* End dayobs */}
          <Select
            id="end-dayobs-input"
            // Get dayobs from TAI window start time
            value={DateTime.fromMillis(currentXMax)
              .minus({ hours: 12, seconds: 37 })
              .toFormat("yyyyLLdd")}
            onValueChange={(newDayobsStr) => {
              // Get new dayobs
              const dayobsEnd = DateTime.fromFormat(newDayobsStr, "yyyyLLdd", {
                zone: "utc",
              });

              // Get end time from window
              const [h, m] = DateTime.fromMillis(currentXMax, {
                zone: "utc",
              })
                .toFormat("HH:mm")
                .split(":")
                .map(Number);

              // Set new datetime
              // If in second half of dayobs -> set as next day
              const dayobsToDate =
                h < 12 ? dayobsEnd.plus({ days: 1 }) : dayobsEnd;
              const dt = dayobsToDate.set({ hour: h, minute: m });

              // Set window
              if (dt.isValid) {
                setSelectedTimeRange([currentXMin, dt.toMillis()]);
              }
            }}
          >
            <SelectTrigger
              id="end-dayobs-select"
              className="w-[120px] bg-white text-black justify-between font-normal shadow-[4px_4px_4px_0px_#3CAE3F] focus-visible:ring-4 focus-visible:ring-green-500/50"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableDayobs.map((dayobs) => (
                <SelectItem key={dayobs} value={dayobs}>
                  {dayobs}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Reset Button */}
      <Button
        className="bg-white text-black w-30 h-10 font-light rounded-md shadow-[4px_4px_4px_0px_#3CAE3F] 
                flex justify-center items-center py-2 px-4 
                hover:shadow-[6px_6px_8px_0px_#3CAE3F] hover:scale-[1.02] hover:bg-white transition-all duration-200"
        onClick={() => setSelectedTimeRange([fullXMin, fullXMax])}
        disabled={
          selectedTimeRange[0] === fullXMin && selectedTimeRange[1] === fullXMax
        }
      >
        Reset Window
      </Button>
    </div>
  );
}
