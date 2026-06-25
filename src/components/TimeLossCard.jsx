import { TriangleAlert } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";

import InfoIcon from "../assets/InfoIcon.svg";
import TimeLossIcon from "../assets/TimeLossIcon.svg";

import { formatDayobsStrForDisplay } from "@/utils/timeUtils";

export default function TimeLossCard({
  narrativeLogData,
  obsStatusData,
  obsStatusAvailability,
  calculatedData,
  narrativeLogloading = false,
  obsStatusLoading = false,
  calculatedFaultLoading = false,
  faultDataUnavailable = false,
  faultErrorMessage = null,
  onClick = false,
}) {
  const loading =
    narrativeLogloading && obsStatusLoading && calculatedFaultLoading;
  const isClickable = onClick && !loading;

  const heading = "Fault Loss";

  const availability = obsStatusAvailability ?? {};
  const availabilityStatus = availability.status ?? "none";
  const availableFrom = availability.available_from
    ? formatDayobsStrForDisplay(String(availability.available_from))
    : null;

  const formatHours = (value) =>
    typeof value === "number" ? value.toFixed(2) : "NA";

  const isFullyAvailable = availabilityStatus === "full";
  const isNotAvailable = availabilityStatus === "none";

  // Tooltip to be shown over obs status data if data
  // partially or fully unavailable due to user querying
  // before/around when the data started being recorded.
  const tooltipText = isNotAvailable ? (
    <>
      Observatory Status data is only available from{" "}
      <strong>{availableFrom ?? "the supported date range"}</strong>.
    </>
  ) : (
    <>
      Observatory Status data is only available from{" "}
      <strong>{availableFrom ?? "the supported date range"}</strong>
      .
      <br />
      Fault time loss has been computed for the available dayobs.
    </>
  );

  return (
    // Card
    <div
      onClick={isClickable ? onClick : undefined}
      className={`flex flex-col justify-between bg-teal-900 text-white font-light p-4 rounded-lg shadow-[4px_4px_4px_0px_#0369A1] transition hover:opacity-90 ${
        isClickable ? "cursor-pointer" : ""
      }`}
    >
      {/* Heading & Icon */}
      <div className="flex flex-row justify-between h-12">
        <div className="text-2xl">{heading}</div>
        <img src={TimeLossIcon} alt={heading} />
      </div>
      {/* Data & Info Icon */}
      <div className="flex flex-row justify-between">
        {/* Data */}
        <div className="grid grid-cols-[auto_1fr] items-center gap-x-4 text-md">
          <div>Obs. Status:</div>
          {obsStatusLoading ? (
            <Skeleton className="h-3 w-10 bg-teal-700" />
          ) : // Show data when availabile
          isFullyAvailable ? (
            <div>{formatHours(obsStatusData)}</div>
          ) : (
            // Show tooltip and warning icon for no/partial data
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 cursor-help">
                  <span>
                    {isNotAvailable ? "NA" : formatHours(obsStatusData)}
                  </span>

                  <TriangleAlert className="h-4 w-4 text-yellow-500" />
                </div>
              </TooltipTrigger>

              <TooltipContent>
                <p>{tooltipText}</p>
              </TooltipContent>
            </Tooltip>
          )}

          <div>Narrative Log:</div>
          {narrativeLogloading ? (
            <Skeleton className="h-3 w-10 bg-teal-700" />
          ) : (
            formatHours(narrativeLogData)
          )}

          <div>Calculated:</div>
          {calculatedFaultLoading ? (
            <Skeleton className="h-3 w-10 bg-teal-700" />
          ) : faultDataUnavailable ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 cursor-help">
                  <span>NA</span>

                  <TriangleAlert className="h-4 w-4 text-yellow-500" />
                </div>
              </TooltipTrigger>

              <TooltipContent>
                <p>{faultErrorMessage}</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <div>{formatHours(calculatedData)}</div>
          )}
        </div>
        {/* Info Icon */}
        <Popover>
          <PopoverTrigger
            className="self-end min-w-4"
            /* Prevents click from propagating to the card 
            to show the tooltip rather than open the dialog*/
            onClick={(e) => e.stopPropagation()}
          >
            <img src={InfoIcon} />
          </PopoverTrigger>
          <PopoverContent className="bg-black text-white text-sm border-yellow-700 w-100">
            <p>
              Observing hours lost to faults as recorded in the Narrative Log
              and Observatory Status, and calculated from exposures.
              <br />
              <br />
              <strong>Observatory Status Fault Loss</strong>
              <br />
              Sum of all observing time with an active <code>FAULT</code>{" "}
              status, except during <code>DOWNTIME</code>.
              <br />
              <br />
              <strong>Narrative Log Fault Loss</strong>
              <br />
              Sum of all time lost to fault as recorded in the Narrative Log.
              <br />
              <br />
              <strong>Calculated Fault Loss</strong>
              <br />
              Total available observing time – exposure time – overhead time* –
              time lost to weather**.
              <br />
              <br />
              <em>
                *overhead time = expected slew and settle time, including a
                potential additional overhead of up to 2 minutes per visit.
              </em>
              <br />
              <em>**weather loss is derived from Observatory Status data.</em>
            </p>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
