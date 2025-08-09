// import { DateTime } from "luxon";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

// import {
//   isoToTAI,
//   taiToMillis,
//   millisToTAI,
//   taiToDayobs,
//   dayobsToTAI,
//   millisToDateTime,
//   millisToHHmm,
// } from "@/utils/timeUtils";

export default function TimeWindowControls({
  fullTimeRange,
  selectedTimeRange,
  setSelectedTimeRange,
  // availableDayobs,
}) {
  // const [fullXMin, fullXMax] = fullTimeRange;
  // let [currentXMin, currentXMax] = selectedTimeRange;
  // if (!fullXMin || !fullXMax) {
  //   return null;
  // }
  // Convert datetime inputs to millis format for plots ====
  const xMinMillis = fullTimeRange[0]?.toMillis();
  const xMaxMillis = fullTimeRange[1]?.toMillis();
  const selectedMinMillis = selectedTimeRange[0]?.toMillis();
  const selectedMaxMillis = selectedTimeRange[1]?.toMillis();

  if (!xMinMillis || !xMaxMillis) return null;
  // --------------------------------------------------------

  return (
    <div className="flex flex-row justify-between mt-4 gap-8 text-white">
      {/* Time Inputs */}
      <div className="flex flex-row gap-4">
        {/* Time Labels */}
        {/* <div className="flex flex-col gap-4">
          <Label
            htmlFor="start-time-input"
            className="h-9 w-18 !items-left text-start"
          >
            Start (TAI):
          </Label>
          <Label htmlFor="end-time-input" className="h-9 w-18 !text-left">
            End (TAI):
          </Label>
        </div> */}

        {/* Time inputs */}
        {/* <div className="flex flex-col gap-4">
          <Input
            type="time" // this is browser dependent and behaves differently in different browsers
            id="start-time-input"
            step="60"
            lang="en-GB"
            inputMode="numeric"
            pattern="[0-9]{2}:[0-9]{2}"
            className="max-w-[100px] bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
            // value={currentXMin.toFormat("HH:mm")}
            value={millisToHHmm(selectedMinMillis)}
            onChange={(e) => {
              const [h, m] = e.target.value.split(":").map(Number);
              // const newStart = currentXMin.set({ hour: h, minute: m });
              const newStart = selectedMinMillis.set({ hour: h, minute: m });
              setSelectedTimeRange([newStart, selectedMaxMillis]);
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
            // value={currentXMax.toFormat("HH:mm")}
            value={millisToHHmm(selectedMaxMillis)}
            onChange={(e) => {
              const [h, m] = e.target.value.split(":").map(Number);
              // const newEnd = currentXMax.set({ hour: h, minute: m });
              const newEnd = selectedMaxMillis.set({ hour: h, minute: m });
              setSelectedTimeRange([selectedMinMillis, newEnd]);
            }}
          />
        </div> */}

        {/* Dayobs Labels */}
        {/* <div className="flex flex-col gap-4">
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
        </div> */}

        {/* Dayobs inputs */}
        <div className="flex flex-col gap-4">
          {/* Start dayobs */}
          {/* <Select
            id="start-dayobs-input"
            // Get dayobs from TAI window start time
            // value={taiToDayobs(selectedMinMillis)}
            value={selectedTimeRange[0]}
            onValueChange={(newDayobsStr) => {
              // Get new dayobs
              const dayobsStart = dayobsToTAI(newDayobsStr);

              // Get start time from window
              const [h, m] = selectedTimeRange[0]//selectedMinMillis
                .toFormat("HH:mm")
                .split(":")
                .map(Number);

              const newXMin = dayobsStart
                .set({ hour: h, minute: m, second: 0 });

              // Set window
              if (newXMin.isValid) {
                setSelectedTimeRange([newXMin, selectedTimeRange[1]]);
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
          </Select> */}

          {/* End dayobs */}
          {/* <Select
            id="end-dayobs-input"
            // Get dayobs from TAI window start time
            value={selectedTimeRange[1]}
            // value={taiToDayobs(selectedMaxMillis)}
            onValueChange={(newDayobsStr) => {
              // Get new dayobs
              const dayobsEnd = dayobsToTAI(newDayobsStr);

              // Get start time from window
              const [h, m] = selectedTimeRange[1]//selectedMaxMillis
                .toFormat("HH:mm")
                .split(":")
                .map(Number);

              const newXMax = dayobsEnd
                .set({ hour: h, minute: m, second: 0 });

              // Set window
              if (newXMax.isValid) {
                setSelectedTimeRange([selectedTimeRange[0], newXMax]);
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
          </Select> */}
        </div>
      </div>

      {/* Reset Button */}
      <Button
        className="bg-white text-black w-30 h-10 font-light rounded-md shadow-[4px_4px_4px_0px_#3CAE3F] 
                flex justify-center items-center py-2 px-4 
                hover:shadow-[6px_6px_8px_0px_#3CAE3F] hover:scale-[1.02] hover:bg-white transition-all duration-200"
        // onClick={() => setSelectedTimeRange([xMinMillis, xMaxMillis])}
        onClick={() => setSelectedTimeRange(fullTimeRange)}
        disabled={
          selectedMinMillis === xMinMillis && selectedMaxMillis === xMaxMillis
        }
      >
        Reset Window
      </Button>
    </div>
  );
}
